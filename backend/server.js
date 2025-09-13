/**
 * University Co-Pilot Backend Server
 * Main Express application
 */

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

// Import services
const SearchService = require('./services/searchService');
const PDFProcessor = require('./services/pdfProcessor');
const ComparisonService = require('./services/comparisonService');
const RecommendationService = require('./services/recommendationService');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize services
const searchService = new SearchService();
const pdfProcessor = new PDFProcessor();
const comparisonService = new ComparisonService();
const recommendationService = new RecommendationService();

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'University Co-Pilot API'
    });
});

// Search universities
app.post('/api/search', async (req, res) => {
    try {
        const { query = '*', filters = {}, top = 10 } = req.body;
        
        const results = await searchService.search(query, filters, top);
        
        res.json({
            success: true,
            results: results,
            count: results.length
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all universities
app.get('/api/universities', async (req, res) => {
    try {
        const universities = await searchService.getAll();
        
        res.json({
            success: true,
            universities: universities,
            count: universities.length
        });
    } catch (error) {
        console.error('Get all universities error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get university by ID
app.get('/api/universities/:id', async (req, res) => {
    try {
        const university = await searchService.getById(req.params.id);
        
        if (!university) {
            return res.status(404).json({
                success: false,
                error: 'University not found'
            });
        }
        
        res.json({
            success: true,
            university: university
        });
    } catch (error) {
        console.error('Get university error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Compare universities
app.post('/api/compare', async (req, res) => {
    try {
        const { universityIds } = req.body;
        
        if (!universityIds || universityIds.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Please select at least 2 universities to compare'
            });
        }
        
        const comparison = await comparisonService.compare(universityIds);
        
        res.json({
            success: true,
            comparison: comparison
        });
    } catch (error) {
        console.error('Comparison error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get recommendations
app.post('/api/recommend', async (req, res) => {
    try {
        const studentProfile = req.body;
        
        const recommendations = await recommendationService.recommend(studentProfile);
        
        res.json({
            success: true,
            recommendations: recommendations
        });
    } catch (error) {
        console.error('Recommendation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Upload and process PDF
app.post('/api/upload-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded'
            });
        }
        
        // Process PDF
        const extractedData = await pdfProcessor.processPDF(req.file.path);
        
        // Add to search index
        const added = await searchService.addUniversity(extractedData);
        
        res.json({
            success: true,
            data: extractedData,
            added: added
        });
    } catch (error) {
        console.error('PDF upload error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Save student profile
app.post('/api/profile', async (req, res) => {
    try {
        const profile = req.body;
        
        // For hackathon, store in memory or file
        // In production, use a database
        const fs = require('fs').promises;
        await fs.writeFile(
            path.join(__dirname, '../data/student_profile.json'),
            JSON.stringify(profile, null, 2)
        );
        
        res.json({
            success: true,
            message: 'Profile saved successfully'
        });
    } catch (error) {
        console.error('Profile save error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get student profile
app.get('/api/profile', async (req, res) => {
    try {
        const fs = require('fs').promises;
        const profilePath = path.join(__dirname, '../data/student_profile.json');
        
        try {
            const data = await fs.readFile(profilePath, 'utf8');
            const profile = JSON.parse(data);
            
            res.json({
                success: true,
                profile: profile
            });
        } catch (err) {
            // No profile exists yet
            res.json({
                success: true,
                profile: null
            });
        }
    } catch (error) {
        console.error('Profile get error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get search suggestions
app.get('/api/suggestions', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q) {
            return res.json({
                success: true,
                suggestions: []
            });
        }
        
        const suggestions = await searchService.getSuggestions(q);
        
        res.json({
            success: true,
            suggestions: suggestions
        });
    } catch (error) {
        console.error('Suggestions error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Initialize data on startup
app.post('/api/initialize', async (req, res) => {
    try {
        const result = await searchService.initializeWithSampleData();
        
        res.json({
            success: true,
            message: 'Data initialized successfully',
            count: result.count
        });
    } catch (error) {
        console.error('Initialize error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('🚀 University Co-Pilot Backend Server');
    console.log(`📍 Running on http://localhost:${PORT}`);
    console.log('📝 Available endpoints:');
    console.log('   POST /api/search - Search universities');
    console.log('   GET  /api/universities - Get all universities');
    console.log('   GET  /api/universities/:id - Get specific university');
    console.log('   POST /api/compare - Compare universities');
    console.log('   POST /api/recommend - Get recommendations');
    console.log('   POST /api/upload-pdf - Upload university PDF');
    console.log('   POST /api/profile - Save student profile');
    console.log('   GET  /api/profile - Get student profile');
});