/**
 * Azure AI Search Service
 * Handles all search operations
 */

const { SearchClient, SearchIndexClient } = require('@azure/search-documents');
const { AzureKeyCredential } = require('@azure/core-auth');

class SearchService {
    constructor() {
        this.endpoint = process.env.AZURE_SEARCH_ENDPOINT;
        this.apiKey = process.env.AZURE_SEARCH_ADMIN_KEY;
        this.indexName = 'universities';
        
        if (!this.endpoint || !this.apiKey) {
            throw new Error('Azure Search credentials not configured');
        }
        
        // Initialize clients
        this.searchClient = new SearchClient(
            this.endpoint,
            this.indexName,
            new AzureKeyCredential(this.apiKey)
        );
        
        this.indexClient = new SearchIndexClient(
            this.endpoint,
            new AzureKeyCredential(this.apiKey)
        );
        
        console.log('✅ Azure Search Service initialized');
    }
    
    async search(query = '*', filters = {}, top = 10) {
        try {
            const searchOptions = {
                top: top,
                includeTotalCount: true,
                select: [
                    'id', 'universityName', 'location', 'deadline',
                    'gpaRequired', 'satRange', 'acceptanceRate',
                    'essaysRequired', 'applicationFee', 'requirements',
                    'programs', 'ranking', 'satLow', 'satHigh'
                ]
            };
            
            // Build filter
            const filterConditions = this.buildFilter(filters);
            if (filterConditions) {
                searchOptions.filter = filterConditions;
            }
            
            // Perform search
            const searchResults = await this.searchClient.search(query, searchOptions);
            
            // Convert to array
            const results = [];
            for await (const result of searchResults.results) {
                results.push(result.document);
            }
            
            return results;
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }
    
    buildFilter(filters) {
        const conditions = [];
        
        if (filters.minGPA) {
            conditions.push(`gpaRequired ge ${filters.minGPA}`);
        }
        if (filters.maxGPA) {
            conditions.push(`gpaRequired le ${filters.maxGPA}`);
        }
        if (filters.minSAT) {
            conditions.push(`satLow ge ${filters.minSAT}`);
        }
        if (filters.maxSAT) {
            conditions.push(`satHigh le ${filters.maxSAT}`);
        }
        if (filters.maxAcceptanceRate) {
            conditions.push(`acceptanceRate le ${filters.maxAcceptanceRate}`);
        }
        if (filters.location) {
            conditions.push(`location eq '${filters.location}'`);
        }
        if (filters.maxEssays) {
            conditions.push(`essaysRequired le ${filters.maxEssays}`);
        }
        
        return conditions.length > 0 ? conditions.join(' and ') : null;
    }
    
    async getAll() {
        return this.search('*', {}, 1000);
    }
    
    async getById(id) {
        try {
            const document = await this.searchClient.getDocument(id);
            return document;
        } catch (error) {
            console.error('Get by ID error:', error);
            return null;
        }
    }
    
    async addUniversity(universityData) {
        try {
            // Ensure ID exists
            if (!universityData.id) {
                universityData.id = this.generateId(universityData.universityName);
            }
            
            const result = await this.searchClient.uploadDocuments([universityData]);
            return result.results[0].succeeded;
        } catch (error) {
            console.error('Add university error:', error);
            throw error;
        }
    }
    
    async updateUniversity(universityData) {
        try {
            const result = await this.searchClient.mergeDocuments([universityData]);
            return result.results[0].succeeded;
        } catch (error) {
            console.error('Update university error:', error);
            throw error;
        }
    }
    
    async deleteUniversity(id) {
        try {
            const result = await this.searchClient.deleteDocuments([{ id }]);
            return result.results[0].succeeded;
        } catch (error) {
            console.error('Delete university error:', error);
            throw error;
        }
    }
    
    async getSuggestions(query) {
        try {
            const suggestions = await this.searchClient.suggest(query, 'sg', {
                top: 5,
                select: ['universityName']
            });
            
            return suggestions.results.map(s => s.document.universityName);
        } catch (error) {
            console.error('Suggestions error:', error);
            return [];
        }
    }
    
    generateId(name) {
        // Generate ID from university name
        return name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    }
    
    async initializeWithSampleData() {
        const sampleData = [
            {
                id: "mit_001",
                universityName: "Massachusetts Institute of Technology",
                location: "Cambridge, MA",
                deadline: "2025-01-01",
                gpaRequired: 4.17,
                satRange: "1520-1580",
                satLow: 1520,
                satHigh: 1580,
                acceptanceRate: 4.1,
                essaysRequired: 5,
                applicationFee: 75,
                requirements: "Common App, 5 essays, 2 teacher recs, transcript, SAT/ACT",
                programs: "Engineering, Computer Science, Mathematics, Physics",
                ranking: 1
            },
            {
                id: "stanford_001",
                universityName: "Stanford University",
                location: "Stanford, CA",
                deadline: "2025-01-02",
                gpaRequired: 4.18,
                satRange: "1470-1570",
                satLow: 1470,
                satHigh: 1570,
                acceptanceRate: 3.9,
                essaysRequired: 8,
                applicationFee: 90,
                requirements: "Common App, 8 essays, 2 teacher recs, counselor rec",
                programs: "Computer Science, Engineering, Medicine, Business",
                ranking: 3
            },
            {
                id: "harvard_001",
                universityName: "Harvard University",
                location: "Cambridge, MA",
                deadline: "2025-01-01",
                gpaRequired: 4.18,
                satRange: "1480-1580",
                satLow: 1480,
                satHigh: 1580,
                acceptanceRate: 3.4,
                essaysRequired: 6,
                applicationFee: 85,
                requirements: "Common App or Coalition App, 6 essays, 2 teacher recs",
                programs: "Liberal Arts, Sciences, Engineering, Business",
                ranking: 2
            },
            {
                id: "berkeley_001",
                universityName: "UC Berkeley",
                location: "Berkeley, CA",
                deadline: "2024-11-30",
                gpaRequired: 3.89,
                satRange: "1330-1530",
                satLow: 1330,
                satHigh: 1530,
                acceptanceRate: 11.4,
                essaysRequired: 4,
                applicationFee: 70,
                requirements: "UC Application, 4 personal insight questions",
                programs: "Engineering, Computer Science, Business, Chemistry",
                ranking: 20
            },
            {
                id: "ucla_001",
                universityName: "UCLA",
                location: "Los Angeles, CA",
                deadline: "2024-11-30",
                gpaRequired: 3.9,
                satRange: "1290-1510",
                satLow: 1290,
                satHigh: 1510,
                acceptanceRate: 8.6,
                essaysRequired: 4,
                applicationFee: 70,
                requirements: "UC Application, 4 personal insight questions",
                programs: "Film, Engineering, Medicine, Business, Psychology",
                ranking: 15
            }
        ];
        
        try {
            const result = await this.searchClient.uploadDocuments(sampleData);
            return { count: result.results.length };
        } catch (error) {
            console.error('Initialize data error:', error);
            throw error;
        }
    }
}

module.exports = SearchService;