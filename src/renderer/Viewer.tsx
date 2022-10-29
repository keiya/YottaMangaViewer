import * as fs from 'fs';
import { useEffect, useState, KeyboardEvent, useRef } from 'react';
import { ipcRenderer } from 'electron';
import './Viewer.css';
import CircularBufferedImage from '../libs/circular-buffered-image'

import path from 'path'
import { start } from 'repl';

interface MenuCheckboxes {
  rightToLeft: boolean;
  twoPageSpread: boolean;
  firstImageIsCover: boolean;
}
const maxLookAheadNum = 4

const cb = new CircularBufferedImage(maxLookAheadNum);


const Viewer = () => {
  const [openPath, setOpenPath] = useState<string>();
  const [menuCheckboxes, setMenuCheckboxes] = useState<MenuCheckboxes>({
    rightToLeft: true,
    twoPageSpread: true,
    firstImageIsCover: false,
  });

  const [files, setFiles] = useState<string[]>([]);
  const [viewingIndex, setViewingIndex] = useState<number>(-1);

  const ref = useRef(null);
  const imglref = useRef(null);
  const imgrref = useRef(null);


  useEffect(() => {
    const listImages = async () => {
      if (!openPath) return
      const lstat = await fs.promises.lstat(openPath);
      let targetDir = null
      if (lstat.isDirectory()) {
        targetDir = openPath
      } else if (lstat.isFile()) {
        targetDir = path.dirname(openPath)
      } else {
        // if not directory or file, nothing to do
        return
      }
      const dirents = await fs.promises.readdir(targetDir, { withFileTypes: true });
      const files = [];
      let idx = 0;
      let startIdx = 0;
      for (const dirent of dirents) {
        if (dirent.isFile()) {
          if (lstat.isFile() && dirent.name === path.basename(openPath)) {
            startIdx = idx;
          }
          const extension = dirent.name.split(".").pop()?.toLowerCase();
          switch (extension) {
            case 'jpg':
            case 'jpeg':
            case 'jfif':
            case 'pjpeg':
            case 'pjp':
            case 'png':
            case 'webp':
            case 'avif':
            case 'gif':
            case 'apng':
            case 'bmp':
            case 'tif':
            case 'tiff':
              files.push(path.join(targetDir, dirent.name));
              idx++;
              break;
            // otherwise, no process
            default:
              break;
          }
        }
      }
      setFiles(files)
      cb.clear()
      await loadImages(files, startIdx, 4)
      setViewingIndex(startIdx)
    };
    listImages();
  }, [openPath]);
  
  const loadImages = async (files: string[], idx:number, lookAheadNum: number) => {
    console.log('loadImages', idx, lookAheadNum)
    const promises: Promise<Buffer>[] = []
    for (let i=idx; i < idx+lookAheadNum && i < files.length; i++) {
      const promiseRead = fs.promises.readFile(files[i])
      promises.push(promiseRead)
    }

    return Promise.allSettled(promises).then((results) => {
      results.forEach((result) => {
        if (result.status == 'rejected') { return; }
        cb.put(result.value)
      })
    })
  }

  useEffect(() => {
    console.log('viewingindex changed', viewingIndex, files[viewingIndex])
    if (!files[viewingIndex]) return;
    //loadImages(viewingIndex);
    const showImage = async () => {
      // const fileBuf = await fs.promises.readFile(files[viewingIndex])
      // const blob = new Blob( [ fileBuf ] );
      
      console.log('LOADIMAGES!')
      const imgrefs: (HTMLImageElement | null)[] = [imglref.current, imgrref.current];
      for (const imgref of imgrefs) {
        if (!imgref) continue;
        cb.showImage(imgref)
      }
    };
    showImage();
  }, [viewingIndex]);

  useEffect(() => {
    if (ref?.current) {
      ref.current.focus();
    }

    ipcRenderer.on('openfile', (event, arg) => {
      setOpenPath(arg)
    })
    ipcRenderer.on('menucheckchanged', (event, arg) => {
      setMenuCheckboxes({ ...menuCheckboxes, ...arg })
    })
  }, []);

  const nextImage = async () => {
    const incr = menuCheckboxes.twoPageSpread ? 2 : 1
    if (viewingIndex < files.length - incr) {
      const nextViewingIndex = viewingIndex + incr
      setViewingIndex(nextViewingIndex)
      await loadImages(files, nextViewingIndex + 2, 2)
    }
  };
  const prevImage = async () => {
    const decr = menuCheckboxes.twoPageSpread ? 2 : 1
    if (viewingIndex - decr >= 0) {
      const nextViewingIndex = viewingIndex - decr
      cb.clear()
      await loadImages(files, nextViewingIndex, 4)
      setViewingIndex(nextViewingIndex)
    }
  };
  const firstImage = async () => {
    cb.clear()
    await loadImages(files, 0, 4)
    setViewingIndex(0)
  };
  const lastImage = () => {
    setViewingIndex(files.length - 1)
  };

  const handleKeyboardEvent = (e: KeyboardEvent) => {
    switch(e.key) {
      case 'ArrowLeft':
        if (menuCheckboxes.rightToLeft) {
          nextImage();
        } else {
          prevImage();
        }
        break;
      case 'ArrowRight':
        if (menuCheckboxes.rightToLeft) {
          prevImage();
        } else {
          nextImage();
        }
        break;
      case ' ':
        nextImage()
        break;
      case 'Home':
        firstImage();
        break;
      case 'End':
        lastImage();
        break;
      }
  };

  const handleImageClickEvent = (kind:string) => {
    console.log(kind)
    switch(kind) {
      case 'left':
        if (menuCheckboxes.rightToLeft)
          nextImage()
        else
          prevImage()
        break;
      case 'right':
        if (menuCheckboxes.rightToLeft)
          prevImage()
        else
          nextImage()
        break;
    }
  }

  const handleDragEnter = (e:React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragLeave = (e:React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDragOver = (e:React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e:React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let file = e.dataTransfer.files[0];
    setOpenPath(file.path)
    e.dataTransfer.clearData();
  };

  return (
    <div ref={ref}
         tabIndex={0}
         onKeyDown={handleKeyboardEvent}
         id='viewer'
         onDrop={handleDrop}
         onDragOver={handleDragOver}
         onDragEnter={handleDragEnter}
         onDragLeave={handleDragLeave}
         className={menuCheckboxes.twoPageSpread ? 'twopage' : ''}
    >
        <div className="imgcontainer" onClick={() => handleImageClickEvent('left')}>
          <img ref={imglref} className="img"></img>
        </div>
        <div className="imgcontainer" onClick={() => handleImageClickEvent('right')}>
          <img ref={imgrref} className="img"></img>
        </div>
    </div>
  );
};
export default Viewer;
