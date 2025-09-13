/**
 * University Comparison Service
 * Handles side-by-side comparisons
 */

const SearchService = require('./searchService');

class ComparisonService {
    constructor() {
        this.searchService = new SearchService();
    }
    
    async compare(universityIds) {
        try {
            // Fetch all universities
            const universities = await Promise.all(
                universityIds.map(id => this.searchService.getById(id))
            );
            
            // Filter out any null results
            const validUniversities = universities.filter(u => u !== null);
            
            if (validUniversities.length < 2) {
                throw new Error('Not enough valid universities to compare');
            }
            
            // Structure comparison data
            const comparison = {
                universities: validUniversities,
                analysis: this.analyzeDifferences(validUniversities),
                summary: this.generateSummary(validUniversities),
                highlights: this.getHighlights(validUniversities)
            };
            
            return comparison;
        } catch (error) {
            console.error('Comparison error:', error);
            throw error;
        }
    }
    
    analyzeDifferences(universities) {
        // GPA Analysis
        const gpas = universities.map(u => u.gpaRequired || 0);
        const gpaAnalysis = {
            highest: {
                value: Math.max(...gpas),
                university: universities.find(u => u.gpaRequired === Math.max(...gpas))?.universityName
            },
            lowest: {
                value: Math.min(...gpas),
                university: universities.find(u => u.gpaRequired === Math.min(...gpas))?.universityName
            },
            range: Math.max(...gpas) - Math.min(...gpas)
        };
        
        // Acceptance Rate Analysis
        const acceptanceRates = universities.map(u => u.acceptanceRate || 100);
        const acceptanceAnalysis = {
            mostSelective: {
                rate: Math.min(...acceptanceRates),
                university: universities.find(u => u.acceptanceRate === Math.min(...acceptanceRates))?.universityName
            },
            leastSelective: {
                rate: Math.max(...acceptanceRates),
                university: universities.find(u => u.acceptanceRate === Math.max(...acceptanceRates))?.universityName
            }
        };
        
        // Essays Analysis
        const essays = universities.map(u => u.essaysRequired || 0);
        const essayAnalysis = {
            most: {
                count: Math.max(...essays),
                university: universities.find(u => u.essaysRequired === Math.max(...essays))?.universityName
            },
            least: {
                count: Math.min(...essays),
                university: universities.find(u => u.essaysRequired === Math.min(...essays))?.universityName
            }
        };
        
        // Deadline Analysis
        const deadlines = universities
            .filter(u => u.deadline)
            .map(u => ({
                university: u.universityName,
                deadline: u.deadline,
                date: new Date(u.deadline)
            }))
            .sort((a, b) => a.date - b.date);
        
        // Cost Analysis
        const fees = universities.map(u => u.applicationFee || 0);
        const costAnalysis = {
            highest: Math.max(...fees),
            lowest: Math.min(...fees),
            total: fees.reduce((a, b) => a + b, 0),
            average: fees.reduce((a, b) => a + b, 0) / fees.length
        };
        
        return {
            gpa: gpaAnalysis,
            acceptanceRate: acceptanceAnalysis,
            essays: essayAnalysis,
            deadlines: deadlines,
            costs: costAnalysis
        };
    }
    
    generateSummary(universities) {
        const names = universities.map(u => u.universityName);
        let summary = `Comparing ${universities.length} universities: ${names.join(', ')}. `;
        
        // GPA insight
        const gpaRange = Math.max(...universities.map(u => u.gpaRequired || 0)) - 
                        Math.min(...universities.map(u => u.gpaRequired || 0));
        if (gpaRange > 0.3) {
            summary += `These schools have significantly different GPA requirements (range: ${gpaRange.toFixed(2)}). `;
        } else {
            summary += 'These schools have similar GPA requirements. ';
        }
        
        // Acceptance rate insight
        const acceptanceRates = universities.map(u => u.acceptanceRate || 0);
        const acceptanceRange = Math.max(...acceptanceRates) - Math.min(...acceptanceRates);
        if (acceptanceRange > 20) {
            summary += `Acceptance rates vary widely (${Math.min(...acceptanceRates)}% to ${Math.max(...acceptanceRates)}%). `;
        }
        
        // Essay insight
        const totalEssays = universities.reduce((sum, u) => sum + (u.essaysRequired || 0), 0);
        summary += `Total essays required if applying to all: ${totalEssays}. `;
        
        return summary;
    }
    
    getHighlights(universities) {
        const highlights = [];
        
        // Find easiest to get into
        const easiest = universities.reduce((prev, current) => 
            (current.acceptanceRate || 0) > (prev.acceptanceRate || 0) ? current : prev
        );
        highlights.push({
            type: 'success',
            text: `Highest acceptance rate: ${easiest.universityName} (${easiest.acceptanceRate}%)`
        });
        
        // Find most prestigious
        const mostPrestigious = universities.reduce((prev, current) => 
            (current.ranking || 999) < (prev.ranking || 999) ? current : prev
        );
        if (mostPrestigious.ranking) {
            highlights.push({
                type: 'info',
                text: `Highest ranked: ${mostPrestigious.universityName} (#${mostPrestigious.ranking})`
            });
        }
        
        // Find earliest deadline
        const earliest = universities
            .filter(u => u.deadline)
            .reduce((prev, current) => 
                new Date(current.deadline) < new Date(prev.deadline) ? current : prev
            );
        if (earliest) {
            highlights.push({
                type: 'warning',
                text: `Earliest deadline: ${earliest.universityName} (${earliest.deadline})`
            });
        }
        
        // Find cheapest
        const cheapest = universities.reduce((prev, current) => 
            (current.applicationFee || 999) < (prev.applicationFee || 999) ? current : prev
        );
        highlights.push({
            type: 'success',
            text: `Lowest application fee: ${cheapest.universityName} ($${cheapest.applicationFee})`
        });
        
        return highlights;
    }
}

module.exports = ComparisonService;