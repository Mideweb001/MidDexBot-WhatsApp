const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const axios = require('axios');

class DocumentProcessor {
  constructor() {
    this.supportedTypes = {
      pdf: ['.pdf'],
      image: ['.jpg', '.jpeg', '.png', '.webp', '.tiff'],
      text: ['.txt', '.md', '.csv']
    };
  }

  async processFile(filePath, fileName) {
    const fileExtension = path.extname(fileName).toLowerCase();
    
    try {
      // Download file from Telegram
      const fileBuffer = await this.downloadTelegramFile(filePath);
      
      if (this.supportedTypes.pdf.includes(fileExtension)) {
        return await this.processPDF(fileBuffer, fileName);
      } else if (this.supportedTypes.image.includes(fileExtension)) {
        return await this.processImage(fileBuffer, fileName);
      } else if (this.supportedTypes.text.includes(fileExtension)) {
        return await this.processText(fileBuffer, fileName);
      } else {
        throw new Error(`Unsupported file type: ${fileExtension}`);
      }
    } catch (error) {
      console.error('❌ File processing error:', error);
      throw error;
    }
  }

  async downloadTelegramFile(filePath) {
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${filePath}`;
    
    try {
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer'
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error('❌ Error downloading file from Telegram:', error);
      throw new Error('Failed to download file from Telegram');
    }
  }

  async processPDF(fileBuffer, fileName) {
    try {
      console.log('📄 Processing PDF:', fileName);
      
      const data = await pdfParse(fileBuffer);
      
      return {
        type: 'pdf',
        fileName: fileName,
        text: data.text,
        metadata: {
          pages: data.numpages,
          info: data.info || {},
          wordCount: this.countWords(data.text),
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ PDF processing error:', error);
      throw new Error('Failed to process PDF file');
    }
  }

  async processImage(fileBuffer, fileName) {
    try {
      console.log('� Processing image with MidDexBot:', fileName);
      
      const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng', {
        logger: m => console.log('� MidDexBot Processing:', m)
      });
      
      return {
        type: 'image',
        fileName: fileName,
        text: text.trim(),
        metadata: {
          ocrConfidence: 'processed',
          wordCount: this.countWords(text),
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ OCR processing error:', error);
      throw new Error('Failed to process image with OCR');
    }
  }

  async processText(fileBuffer, fileName) {
    try {
      console.log('📝 Processing text file:', fileName);
      
      const text = fileBuffer.toString('utf-8');
      
      return {
        type: 'text',
        fileName: fileName,
        text: text,
        metadata: {
          encoding: 'utf-8',
          wordCount: this.countWords(text),
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Text processing error:', error);
      throw new Error('Failed to process text file');
    }
  }

  // Helper method for processing images from Telegram file path
  async processTelegramImage(filePath) {
    try {
      console.log('� MidDexBot processing Telegram image:', filePath);
      
      // Download file from Telegram
      const fileBuffer = await this.downloadTelegramFile(filePath);
      
      // Process with MidDexBot
      const { data: { text } } = await Tesseract.recognize(fileBuffer, 'eng', {
        logger: m => console.log('� MidDexBot Processing:', m)
      });
      
      return {
        type: 'image',
        fileName: 'telegram_image.jpg',
        text: text.trim(),
        metadata: {
          ocrConfidence: 'processed',
          wordCount: this.countWords(text),
          extractedAt: new Date().toISOString(),
          source: 'telegram'
        }
      };
    } catch (error) {
      console.error('❌ Telegram image processing error:', error);
      throw new Error('Failed to process Telegram image with OCR');
    }
  }

  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  isSupported(fileName) {
    const extension = path.extname(fileName).toLowerCase();
    return Object.values(this.supportedTypes).some(types => types.includes(extension));
  }

  getSupportedTypes() {
    return this.supportedTypes;
  }
}

module.exports = DocumentProcessor;