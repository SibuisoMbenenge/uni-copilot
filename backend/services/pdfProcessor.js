/**
 * PDF Processing Service
 * Extracts university information from PDF files
 */

const fs = require('fs').promises;
const pdf = require('pdf-parse');
const { v4: uuidv4 } = require('uuid');

class PDFProcessor {
    constructor() {
        this.patterns = {
            gpa: /(?:GPA|Grade Point Average)[:\s]*([0-9]\.[0-9]{1,2})/i,
            sat: /(?:SAT)[:\s]*(\d{3,4})[\s-]*(\d{3,4})/i,
            act: /(?:ACT)[:\s]*(\d{2})[\s-]*(\d{2})/i,
            deadline: /(?:Deadline|Due|Submit by)[:\s]*([A-Za-z]+ \d{1,2},? \d{4})/i,
            acceptanceRate: /(?:Acceptance Rate|Admit Rate)[:\s]*(\d{1,2}\.?\d*)%/i,
            fee: /(?:Application Fee)[:\s]*\$(\d+)/i,
            essays: /(\d+)\s*(?:essay|essays|supplement)/i,
            ranking: /(?:Rank|Ranking)[:\s#]*(\d+)/i
        };
    }
    
    async processPDF(filePath) {
        try {
            // Read PDF file
            const dataBuffer = await fs.readFile(filePath);
            
            // Parse PDF
            const data = await pdf(dataBuffer);
            const text = data.text;
            
            // Extract information
            const extractedData = this.extractInformation(text);
            
            // Clean up uploaded file
            await fs.unlink(filePath).catch(err => console.error('Cleanup error:', err));
            
            return extractedData;
        } catch (error) {
            console.error('PDF processing error:', error);
            throw new Error('Failed to process PDF: ' + error.message);
        }
    }
    
    extractInformation(text) {
        const data = {
            id: uuidv4(),
            universityName: this.extractUniversityName(text),
            location: this.extractLocation(text),
            deadline: this.extractDeadline(text),
            gpaRequired: this.extractGPA(text),
            satRange: this.extractSATRange(text),
            actRange: this.extractACTRange(text),
            acceptanceRate: this.extractAcceptanceRate(text),
            applicationFee: this.extractFee(text),
            essaysRequired: this.extractEssays(text),
            requirements: this.extractRequirements(text),
            programs: this.extractPrograms(text),
            ranking: this.extractRanking(text),
            extractedAt: new Date().toISOString()
        };
        
        // Process SAT range for filtering
        if (data.satRange) {
            const parts = data.satRange.split('-');
            if (parts.length === 2) {
                data.satLow = parseInt(parts[0]);
                data.satHigh = parseInt(parts[1]);
            }
        }
        
        return data;
    }
    
    extractUniversityName(text) {
        // Look for university name in first few lines
        const lines = text.split('\n').slice(0, 10);
        
        for (const line of lines) {
            if (line.match(/university|college|institute/i)) {
                // Clean up the line
                const cleaned = line.trim()
                    .replace(/[^\w\s]/g, '')
                    .replace(/\s+/g, ' ');
                
                if (cleaned.length > 5 && cleaned.length < 100) {
                    return cleaned;
                }
            }
        }
        
        return 'Unknown University';
    }
    
    extractLocation(text) {
        // Common state abbreviations
        const statePattern = /\b([A-Z]{2})\b/g;
        const cityStatePattern = /([A-Za-z\s]+),\s*([A-Z]{2})/;
        
        const match = text.match(cityStatePattern);
        if (match) {
            return `${match[1].trim()}, ${match[2]}`;
        }
        
        return null;
    }
    
    extractDeadline(text) {
        const match = text.match(this.patterns.deadline);
        return match ? match[1] : null;
    }
    
    extractGPA(text) {
        const match = text.match(this.patterns.gpa);
        return match ? parseFloat(match[1]) : null;
    }
    
    extractSATRange(text) {
        const match = text.match(this.patterns.sat);
        return match ? `${match[1]}-${match[2]}` : null;
    }
    
    extractACTRange(text) {
        const match = text.match(this.patterns.act);
        return match ? `${match[1]}-${match[2]}` : null;
    }
    
    extractAcceptanceRate(text) {
        const match = text.match(this.patterns.acceptanceRate);
        return match ? parseFloat(match[1]) : null;
    }
    
    extractFee(text) {
        const match = text.match(this.patterns.fee);
        return match ? parseInt(match[1]) : null;
    }
    
    extractEssays(text) {
        const match = text.match(this.patterns.essays);
        return match ? parseInt(match[1]) : null;
    }
    
    extractRanking(text) {
        const match = text.match(this.patterns.ranking);
        return match ? parseInt(match[1]) : null;
    }
    
    extractRequirements(text) {
        const requirements = [];
        
        // Check for common requirements
        if (text.match(/transcript/i)) {
            requirements.push('Official Transcript');
        }
        if (text.match(/recommendation|letter of rec/i)) {
            const recMatch = text.match(/(\d+)\s*(?:letter|recommendation)/i);
            if (recMatch) {
                requirements.push(`${recMatch[1]} Letters of Recommendation`);
            } else {
                requirements.push('Letters of Recommendation');
            }
        }
        if (text.match(/SAT|ACT/i)) {
            requirements.push('Standardized Test Scores');
        }
        if (text.match(/common app/i)) {
            requirements.push('Common Application');
        }
        if (text.match(/coalition/i)) {
            requirements.push('Coalition Application');
        }
        if (text.match(/portfolio/i)) {
            requirements.push('Portfolio');
        }
        if (text.match(/interview/i)) {
            requirements.push('Interview');
        }
        
        return requirements.join(', ');
    }
    
    extractPrograms(text) {
        const programs = [];
        
        // Common program keywords
        const programKeywords = [
            'Engineering', 'Computer Science', 'Business', 'Medicine',
            'Law', 'Arts', 'Sciences', 'Mathematics', 'Physics',
            'Chemistry', 'Biology', 'Psychology', 'Economics',
            'Political Science', 'History', 'English', 'Philosophy',
            'Architecture', 'Design', 'Music', 'Theater', 'Film'
        ];
        
        for (const program of programKeywords) {
            if (text.match(new RegExp(program, 'i'))) {
                programs.push(program);
            }
        }
        
        return programs.slice(0, 5).join(', '); // Limit to top 5
    }
}

module.exports = PDFProcessor;