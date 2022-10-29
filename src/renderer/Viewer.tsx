import * as fs from 'fs';
import { useEffect, useState, KeyboardEvent, useRef } from 'react';
import { ipcRenderer } from 'electron';

import path from 'path'

const Viewer = () => {
  const [openPath, setOpenPath] = useState<string>();

  const [files, setFiles] = useState<string[]>([]);
  const [viewingIndex, setViewingIndex] = useState<number>(0);
  const rightToLeft = true

  useEffect(() => {
      const listImages = async () => {
          if (!openPath) return
          const lstat = await fs.promises.lstat(openPath);
          console.log(lstat)
          let targetDir = null
          if (lstat.isDirectory()) {
            targetDir = openPath
          } else if (lstat.isFile()) {
            targetDir = path.dirname(openPath)
          } else {
            // if not directory or file, nothing to do
            return
          }
          console.log(targetDir)
          const dirents = await fs.promises.readdir(targetDir, { withFileTypes: true });
          const files = [];
          let idx = 0;
          for (const dirent of dirents) {
            if (dirent.isFile()) {
              if (lstat.isFile() && dirent.name === path.basename(openPath)) {
                console.log(idx)
                setViewingIndex(idx)
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
      };
      listImages();
  }, [openPath]);

  useEffect(() => {
    console.log('viewingindex changed', viewingIndex)
  }, [viewingIndex]);

  const ref = useRef(null);


  useEffect(() => {
    if (ref?.current) {
      ref.current.focus();
    }

    ipcRenderer.on('openfile', (event, arg) => {
      setOpenPath(arg)
    })
  }, []);

  const nextImage = () => {
    if (viewingIndex < files.length) {
      setViewingIndex(viewingIndex + 1)
    }
  };
  const prevImage = () => {
    if (viewingIndex > 0) {
      setViewingIndex(viewingIndex - 1)
    }
  };
  const firstImage = () => {
    setViewingIndex(0)
  };
  const lastImage = () => {
    setViewingIndex(files.length - 1)
  };

  const handleKeyboardEvent = (e: KeyboardEvent) => {
    switch(e.key) {
      case 'ArrowLeft':
        if (rightToLeft) {
          nextImage();
        } else {
          prevImage();
        }
        break;
      case 'ArrowRight':
        if (rightToLeft) {
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
        if (rightToLeft)
          nextImage()
        else
          prevImage()
        break;
      case 'right':
        if (rightToLeft)
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
    console.log(file)
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
    >
        <div id="image-left" onClick={() => handleImageClickEvent('left')}>

        </div>
        <div id="image-right" onClick={() => handleImageClickEvent('right')}>
          
        </div>
    </div>
  );
};
export default Viewer;
