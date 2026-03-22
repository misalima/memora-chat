export interface Document {
  id: string;
  filename: string;
  fileType: string;
  totalChunks: number;
  createdAt: Date;
}

export interface UploadDocumentResponse {
  id: string;
  filename: string;
  totalChunks: number;
  message: string;
}