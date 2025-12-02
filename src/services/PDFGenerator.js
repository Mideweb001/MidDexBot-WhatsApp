const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs').promises;
const path = require('path');

class PDFGenerator {
  constructor() {
    this.outputDir = path.join(process.cwd(), 'generated');
    this.ensureOutputDir();
  }

  async ensureOutputDir() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      console.error('🔻 Error creating output directory:', error);
    }
  }

  async generateCVPDF(cvData, filename = 'improved-cv.pdf') {
    try {
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      
      const page = pdfDoc.addPage([612, 792]); // Standard letter size
      const { width, height } = page.getSize();
      
      let yPosition = height - 50;
      const margin = 50;
      const lineHeight = 20;

      // Header
      page.drawText('PROFESSIONAL RESUME', {
        x: margin,
        y: yPosition,
        size: 24,
        font: timesRomanBoldFont,
        color: rgb(0, 0.2, 0.4),
      });

      yPosition -= 40;

      // Add CV content sections
      const sections = [
        { title: 'PROFESSIONAL SUMMARY', content: cvData.summary },
        { title: 'KEY SKILLS', content: cvData.keyPoints?.join('\n• ') || 'Skills to be added' },
        { title: 'EXPERIENCE', content: cvData.experience || 'Experience details to be added' },
        { title: 'EDUCATION', content: cvData.education || 'Education details to be added' }
      ];

      for (const section of sections) {
        if (yPosition < 100) {
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = height - 50;
        }

        // Section title
        page.drawText(section.title, {
          x: margin,
          y: yPosition,
          size: 14,
          font: timesRomanBoldFont,
          color: rgb(0, 0.2, 0.4),
        });

        yPosition -= 25;

        // Section content
        const lines = this.wrapText(section.content, 80);
        for (const line of lines) {
          if (yPosition < 50) break;
          
          page.drawText(line, {
            x: margin,
            y: yPosition,
            size: 11,
            font: timesRomanFont,
            color: rgb(0, 0, 0),
          });
          
          yPosition -= lineHeight;
        }

        yPosition -= 10; // Extra space between sections
      }

      // Add ATS score if available
      if (cvData.atsScore) {
        yPosition -= 20;
        page.drawText(`ATS Compatibility Score: ${cvData.atsScore}/100`, {
          x: margin,
          y: yPosition,
          size: 10,
          font: timesRomanBoldFont,
          color: rgb(0.2, 0.6, 0.2),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const filePath = path.join(this.outputDir, filename);
      await fs.writeFile(filePath, pdfBytes);

      return {
        success: true,
        filePath: filePath,
        filename: filename,
        size: pdfBytes.length
      };
    } catch (error) {
      console.error('🔻 PDF generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateCoverLetterPDF(coverLetterData, filename = 'cover-letter.pdf') {
    try {
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      
      const page = pdfDoc.addPage([612, 792]);
      const { width, height } = page.getSize();
      
      let yPosition = height - 50;
      const margin = 50;
      const lineHeight = 18;

      // Header
      page.drawText('COVER LETTER', {
        x: margin,
        y: yPosition,
        size: 20,
        font: timesRomanBoldFont,
        color: rgb(0, 0.2, 0.4),
      });

      yPosition -= 60;

      // Date
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      page.drawText(currentDate, {
        x: margin,
        y: yPosition,
        size: 11,
        font: timesRomanFont,
      });

      yPosition -= 40;

      // Cover letter content
      const lines = this.wrapText(coverLetterData.coverLetter, 85);
      for (const line of lines) {
        if (yPosition < 50) {
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = height - 50;
        }
        
        page.drawText(line, {
          x: margin,
          y: yPosition,
          size: 11,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        
        yPosition -= lineHeight;
      }

      const pdfBytes = await pdfDoc.save();
      const filePath = path.join(this.outputDir, filename);
      await fs.writeFile(filePath, pdfBytes);

      return {
        success: true,
        filePath: filePath,
        filename: filename,
        size: pdfBytes.length
      };
    } catch (error) {
      console.error('🔻 Cover letter PDF generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  wrapText(text, maxLength) {
    if (!text) return [''];
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  async generateTextToPDF(textData, filename = 'text-document.pdf') {
    try {
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      
      const page = pdfDoc.addPage([612, 792]); // Standard letter size
      const { width, height } = page.getSize();
      
      let yPosition = height - 50;
      const margin = 50;
      const lineHeight = 18;

      // Header
      const title = textData.type || 'PROFESSIONAL DOCUMENT';
      page.drawText(title, {
        x: margin,
        y: yPosition,
        size: 20,
        font: timesRomanBoldFont,
        color: rgb(0, 0.2, 0.4),
      });

      yPosition -= 40;

      // Date
      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      page.drawText(`Generated: ${currentDate}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      yPosition -= 30;

      // Content sections
      if (textData.summary) {
        // Summary section
        page.drawText('SUMMARY', {
          x: margin,
          y: yPosition,
          size: 14,
          font: timesRomanBoldFont,
          color: rgb(0, 0.2, 0.4),
        });

        yPosition -= 20;

        const summaryLines = this.wrapText(textData.summary, 85);
        for (const line of summaryLines) {
          if (yPosition < 50) {
            const newPage = pdfDoc.addPage([612, 792]);
            yPosition = height - 50;
          }
          
          page.drawText(line, {
            x: margin,
            y: yPosition,
            size: 11,
            font: timesRomanFont,
          });
          
          yPosition -= lineHeight;
        }

        yPosition -= 10;
      }

      // Main content
      const contentToShow = textData.originalContent || textData.content;
      if (contentToShow) {
        if (yPosition < 100) {
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = height - 50;
        }

        page.drawText('CONTENT', {
          x: margin,
          y: yPosition,
          size: 14,
          font: timesRomanBoldFont,
          color: rgb(0, 0.2, 0.4),
        });

        yPosition -= 20;

        const contentLines = this.wrapText(contentToShow, 85);
        for (const line of contentLines) {
          if (yPosition < 50) {
            const newPage = pdfDoc.addPage([612, 792]);
            yPosition = height - 50;
          }
          
          page.drawText(line, {
            x: margin,
            y: yPosition,
            size: 11,
            font: timesRomanFont,
          });
          
          yPosition -= lineHeight;
        }
      }

      // Key points if available
      if (textData.keyPoints && textData.keyPoints.length > 0) {
        yPosition -= 20;
        
        if (yPosition < 100) {
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = height - 50;
        }

        page.drawText('KEY POINTS', {
          x: margin,
          y: yPosition,
          size: 14,
          font: timesRomanBoldFont,
          color: rgb(0, 0.2, 0.4),
        });

        yPosition -= 20;

        for (const point of textData.keyPoints) {
          if (yPosition < 50) {
            const newPage = pdfDoc.addPage([612, 792]);
            yPosition = height - 50;
          }
          
          page.drawText(`• ${point}`, {
            x: margin,
            y: yPosition,
            size: 11,
            font: timesRomanFont,
          });
          
          yPosition -= lineHeight;
        }
      }

      // Footer with MidDexBot branding
      if (yPosition > 100) {
        yPosition = 50;
      } else {
        const newPage = pdfDoc.addPage([612, 792]);
        yPosition = 50;
      }

      page.drawText('Generated by MidDexBot - Professional AI Assistant', {
        x: margin,
        y: yPosition,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.6, 0.6, 0.6),
      });

      const pdfBytes = await pdfDoc.save();
      const filePath = path.join(this.outputDir, filename);
      await fs.writeFile(filePath, pdfBytes);

      return {
        success: true,
        filePath: filePath,
        filename: filename,
        size: pdfBytes.length
      };
    } catch (error) {
      console.error('🔻 Text to PDF generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateImageToPDF(imageData, filename = 'image-document.pdf') {
    try {
      const pdfDoc = await PDFDocument.create();
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      
      const page = pdfDoc.addPage([612, 792]); // Standard letter size
      const { width, height } = page.getSize();
      
      let yPosition = height - 50;
      const margin = 50;
      const lineHeight = 18;

      // Header
      page.drawText('IMAGE DOCUMENT', {
        x: margin,
        y: yPosition,
        size: 20,
        font: timesRomanBoldFont,
        color: rgb(0, 0.2, 0.4),
      });

      yPosition -= 40;

      // Date and processing info
      page.drawText(`Processed: ${imageData.timestamp}`, {
        x: margin,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      yPosition -= 20;

      page.drawText('Generated by MidDexBot AI Assistant', {
        x: margin,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      yPosition -= 40;

      // Try to embed and display the image
      let imageEmbedded = false;
      
      try {
        if (imageData.imageUrl) {
          // Download image from Telegram using axios (already installed)
          const axios = require('axios');
          
          console.log('Downloading image from:', imageData.imageUrl);
          const response = await axios.get(imageData.imageUrl, { 
            responseType: 'arraybuffer',
            timeout: 30000 
          });
          
          if (response.status !== 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const imageBuffer = Buffer.from(response.data);
          console.log('Image downloaded, size:', imageBuffer.length, 'bytes');
          
          // Try to embed image (works with PNG and JPEG)
          let embeddedImage;
          
          try {
            // Try JPEG first (most common for Telegram photos)
            embeddedImage = await pdfDoc.embedJpg(imageBuffer);
            console.log('Image embedded as JPEG');
          } catch (jpgError) {
            try {
              // Try PNG if JPEG fails
              embeddedImage = await pdfDoc.embedPng(imageBuffer);
              console.log('Image embedded as PNG');
            } catch (pngError) {
              console.log('Could not embed image as PNG or JPEG:', { jpgError: jpgError.message, pngError: pngError.message });
              embeddedImage = null;
            }
          }

          if (embeddedImage) {
            // Calculate image dimensions to fit on page
            const imageWidth = embeddedImage.width;
            const imageHeight = embeddedImage.height;
            const maxWidth = width - (margin * 2);
            const maxHeight = 300; // Reserve space for text below
            
            let scaledWidth = imageWidth;
            let scaledHeight = imageHeight;
            
            // Scale down if too large
            if (scaledWidth > maxWidth) {
              const scale = maxWidth / scaledWidth;
              scaledWidth = maxWidth;
              scaledHeight = scaledHeight * scale;
            }
            
            if (scaledHeight > maxHeight) {
              const scale = maxHeight / scaledHeight;
              scaledHeight = maxHeight;
              scaledWidth = scaledWidth * scale;
            }

            // Center the image horizontally
            const imageX = (width - scaledWidth) / 2;
            
            page.drawImage(embeddedImage, {
              x: imageX,
              y: yPosition - scaledHeight,
              width: scaledWidth,
              height: scaledHeight,
            });

            yPosition -= (scaledHeight + 30);
            imageEmbedded = true;
            console.log('Image successfully embedded in PDF');
          }
        }

      } catch (imageError) {
        console.error('Image embedding error:', imageError.message);
        console.error('Full error:', imageError);
      }
      
      // If image couldn't be embedded, add a placeholder note
      if (!imageEmbedded) {
        page.drawText('📷 Original image could not be embedded', {
          x: margin,
          y: yPosition,
          size: 12,
          font: timesRomanFont,
          color: rgb(0.6, 0.6, 0.6),
        });
        
        page.drawText('(Text content preserved below)', {
          x: margin,
          y: yPosition - 15,
          size: 10,
          font: timesRomanFont,
          color: rgb(0.6, 0.6, 0.6),
        });
        
        yPosition -= 50;
      }

      // Add extracted text if available
      if (imageData.analysis && imageData.analysis.trim()) {
        if (yPosition < 150) {
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = height - 50;
        }

        page.drawText('EXTRACTED TEXT', {
          x: margin,
          y: yPosition,
          size: 14,
          font: timesRomanBoldFont,
          color: rgb(0, 0.2, 0.4),
        });

        yPosition -= 25;

        const textLines = this.wrapText(imageData.analysis, 85);
        for (const line of textLines) {
          if (yPosition < 50) {
            const newPage = pdfDoc.addPage([612, 792]);
            yPosition = height - 50;
          }
          
          page.drawText(line, {
            x: margin,
            y: yPosition,
            size: 11,
            font: timesRomanFont,
          });
          
          yPosition -= lineHeight;
        }
      }

      // Add AI analysis if provided
      if (imageData.text && imageData.text !== imageData.analysis) {
        yPosition -= 20;
        
        if (yPosition < 100) {
          const newPage = pdfDoc.addPage([612, 792]);
          yPosition = height - 50;
        }

        page.drawText('AI ANALYSIS', {
          x: margin,
          y: yPosition,
          size: 14,
          font: timesRomanBoldFont,
          color: rgb(0, 0.2, 0.4),
        });

        yPosition -= 25;

        const analysisLines = this.wrapText(imageData.text, 85);
        for (const line of analysisLines) {
          if (yPosition < 50) {
            const newPage = pdfDoc.addPage([612, 792]);
            yPosition = height - 50;
          }
          
          page.drawText(line, {
            x: margin,
            y: yPosition,
            size: 11,
            font: timesRomanFont,
          });
          
          yPosition -= lineHeight;
        }
      }

      // Footer
      const footerY = 30;
      page.drawText('Generated by MidDexBot - Professional AI Document Processing', {
        x: margin,
        y: footerY,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.6, 0.6, 0.6),
      });

      const pdfBytes = await pdfDoc.save();
      const filePath = path.join(this.outputDir, filename);
      await fs.writeFile(filePath, pdfBytes);

      return {
        success: true,
        filePath: filePath,
        filename: filename,
        size: pdfBytes.length
      };
    } catch (error) {
      console.error('🔻 Image to PDF generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cleanup(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('🔻 Cleanup error:', error);
    }
  }
}

module.exports = PDFGenerator;