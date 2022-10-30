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

const Viewer = () => {
  const [openPath, setOpenPath] = useState<string>();
  const [menuCheckboxes, setMenuCheckboxes] = useState<MenuCheckboxes>({
    rightToLeft: true,
    twoPageSpread: true,
    firstImageIsCover: false,
  });

  const [files, setFiles] = useState<string[]>([]);
  const [viewingIndex, setViewingIndex] = useState<number>(-1);
  const [imageRefs, setImageRefs] = useState<any[]>([]);

  const ref = useRef(null);
  const imgrefs = Array(4)
  for (let i=0; i<4; i++) {
    imgrefs[i] = useRef(null);
  }

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
      await loadImages(files, startIdx, 4)
      setViewingIndex(startIdx)
    };
    listImages();
  }, [openPath]);

  const loadImage = async (filePath: string, elem: HTMLImageElement) => {
    const buf = await fs.promises.readFile(filePath);
    const url = URL.createObjectURL(new Blob( [ buf ] ));
    elem.src = url;
    return elem.decode().finally(() => URL.revokeObjectURL( url )).catch(e => {
      console.error(e)
    });
  }

  const cleanImages = () => {
    for (let i=0; i < 4; i++) {
      imgrefs[i].current.src = null
    }
  }
  
  const loadImages = async (files: string[], idx:number, limit: number) => {
    let imgrefMap = [0, 1, 2, 3]
    if (menuCheckboxes.rightToLeft) {
      imgrefMap = [1, 0, 3, 2]
    }
    const imgRefMod = menuCheckboxes.twoPageSpread ? 4 : 2;
    for (let i=0; i < limit && i < files.length; i++) {
      loadImage(files[i+idx], imgrefs[imgrefMap[(i+idx)%imgRefMod]].current)
    }
  }

  useEffect(() => {
    console.log('viewingindex changed', viewingIndex, files[viewingIndex])
    if (!files[viewingIndex]) return;
    const showImage = async () => {
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
      cleanImages()
      await loadImages(files, nextViewingIndex, 4)
      setViewingIndex(nextViewingIndex)
    }
  };
  const firstImage = async () => {
    if (viewingIndex == 0) return;
    await loadImages(files, 0, 4)
    setViewingIndex(0)
  };
  const lastImage = async () => {
    const nextViewingIndex = files.length - 1
    if (viewingIndex == nextViewingIndex) return;
    await loadImages(files, nextViewingIndex, 1)
    setViewingIndex(nextViewingIndex)
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
          <img ref={imgrefs[0]} className={`img left img-${viewingIndex%4==0?'current':'standby'}`}></img>
          <img ref={imgrefs[2]} className={`img left img-${viewingIndex%4!=0?'current':'standby'}`}></img>
        </div>
        <div className="imgcontainer" onClick={() => handleImageClickEvent('right')}>
          <img ref={imgrefs[1]} className={`img right img-${viewingIndex%4==0?'current':'standby'}`}></img>
          <img ref={imgrefs[3]} className={`img right img-${viewingIndex%4!=0?'current':'standby'}`}></img>
        </div>
    </div>
  );
};
export default Viewer;
