declare module "pdfmake/build/pdfmake" {
  interface TDocumentDefinitions {
    content: any[];
    styles?: Record<string, any>;
    defaultStyle?: Record<string, any>;
    pageSize?: string | { width: number; height: number };
    pageMargins?: [number, number, number, number];
    footer?: any;
    [key: string]: any;
  }

  interface PdfMake {
    createPdf(doc: TDocumentDefinitions): {
      getBuffer(cb: (buffer: Buffer) => void): void;
      download(name?: string): void;
      open(): void;
      print(): void;
    };
    vfs: Record<string, string>;
  }

  const pdfMake: PdfMake & { vfs: Record<string, string> };
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfs: { pdfMake: { vfs: Record<string, string> } };
  export default vfs;
}
