export default class CircularBufferedImage {
  private buf
  private bufsize:number
  private end:number = 0
  private start:number = 0

  constructor(size:number) {
    this.buf = new Array(size);
    this.bufsize = size
  }

  public put(item: Buffer) {
    const url = URL.createObjectURL(new Blob( [ item ] ));
    this.buf[this.end++] = url;
    this.end %= this.bufsize;
    console.log('CB-PUT:', this.start, this.end, url)
  }

  public showImage(imgref: HTMLImageElement) {
    const url = this.buf[this.start++];
    this.start %= this.bufsize;
    imgref.src = url;
    imgref.onload = e => URL.revokeObjectURL( url );
    console.log('CB-GET:', this.start, this.end, url)
  }

  public clear() {
    this.buf.forEach((url) => {
      if (!url) return;
      URL.revokeObjectURL( url );
    })
    this.end = 0
    this.start = 0
  }
}
