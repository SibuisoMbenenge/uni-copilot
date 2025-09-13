/**
 * Recommendation Service
 * Provides personalized university recommendations
 */

const SearchService = require('./searchService');

class RecommendationService {
    constructor() {
        this.searchService = new SearchService();
    }
    
    async recommend(studentProfile) {
        try {
            // Get all universities
            const allUniversities = await this.searchService.getAll();
            
            // Score and categorize each university
            const scoredUniversities = allUniversities.map(university => {
                const matchScore = this.calculateMatchScore(university, studentProfile);
                const category = this.categorizeSchool(university, studentProfile);
                const reasoning = this.generateReasoning(university, studentProfile, matchScore, category);
                
                return {
                    ...university,
                    matchScore,
                    category,
                    reasoning
                };
            });
            
            // Sort by match score
            scoredUniversities.sort((a, b) => b.matchScore - a.matchScore);
            
            // Group by category
            const safety = scoredUniversities
                .filter(u => u.category === 'Safety')
                .slice(0, 5);
            
            const target = scoredUniversities
                .filter(u => u.category === 'Target')
                .slice(0, 5);
            
            const reach = scoredUniversities
                .filter(u => u.category === 'Reach')
                .slice(0, 5);
            
            // Generate summary
            const summary = this.generateRecommendationSummary(
                { safety, target, reach },
                studentProfile
            );
            
            return {
                safety,
                target,
                reach,
                summary,
                stats: {
                    totalEvaluated: allUniversities.length,
                    safetyCount: safety.length,
                    targetCount: target.length,
                    reachCount: reach.length
                }
            };
        } catch (error) {
            console.error('Recommendation error:', error);
            throw error;
        }
    }
    
    calculateMatchScore(university, profile) {
        let score = 50; // Base score
        
        const studentGPA = profile.gpa || 3.5;
        const studentSAT = profile.sat || 1400;
        const uniGPA = university.gpaRequired || 3.5;
        const uniSATLow = university.satLow || 1200;
        const uniSATHigh = university.satHigh || 1600;
        
        // GPA Match (30 points)
        const gpaDiff = studentGPA - uniGPA;
        if (gpaDiff >= 0) {
            // Student meets or exceeds GPA requirement
            score += Math.min(30, 30 - (gpaDiff * 5));
        } else {
            // Student below GPA requirement
            score += Math.max(0, 30 + (gpaDiff * 20));
        }
        
        // SAT Match (30 points)
        if (studentSAT >= uniSATHigh) {
            score += 30; // Exceeds range
        } else if (studentSAT >= uniSATLow) {
            // Within range - calculate position
            const position = (studentSAT - uniSATLow) / (uniSATHigh - uniSATLow);
            score += 15 + (position * 15);
        } else {
            // Below range
            const gap = uniSATLow - studentSAT;
            score += Math.max(0, 30 - (gap / 10));
        }
        
        // Location Preference (10 points)
        if (profile.locationPreference) {
            const locations = Array.isArray(profile.locationPreference) 
                ? profile.locationPreference 
                : [profile.locationPreference];
            
            if (locations.some(loc => 
                university.location?.toLowerCase().includes(loc.toLowerCase())
            )) {
                score += 10;
            }
        }
        
        // Major Match (10 points)
        if (profile.intendedMajor && university.programs) {
            if (university.programs.toLowerCase().includes(profile.intendedMajor.toLowerCase())) {
                score += 10;
            }
        }
        
        // Essay Preference (5 points)
        if (profile.maxEssays) {
            if (university.essaysRequired <= profile.maxEssays) {
                score += 5;
            }
        }
        
        // Normalize score to 0-100
        return Math.min(100, Math.max(0, score));
    }
    
    categorizeSchool(university, profile) {
        const studentGPA = profile.gpa || 3.5;
        const studentSAT = profile.sat || 1400;
        const uniGPA = university.gpaRequired || 3.5;
        const uniSATLow = university.satLow || 1200;
        const acceptanceRate = university.acceptanceRate || 50;
        
        // Calculate how well student matches
        const gpaMargin = studentGPA - uniGPA;
        const satMargin = studentSAT - uniSATLow;
        
        // Safety School Criteria
        if (gpaMargin >= 0.2 && 
            satMargin >= 100 && 
            acceptanceRate > 30) {
            return 'Safety';
        }
        
        // Reach School Criteria
        if (gpaMargin < -0.1 || 
            satMargin < -50 || 
            acceptanceRate < 15) {
                return 'Reach';
        }
        
        // Everything else is Target
        return 'Target';
    }
    
    generateReasoning(university, profile, score, category) {
        const reasons = [];
        
        // GPA comparison
        const studentGPA = profile.gpa || 3.5;
        const uniGPA = university.gpaRequired || 3.5;
        
        if (studentGPA >= uniGPA) {
            reasons.push(`Your GPA (${studentGPA}) meets or exceeds their requirement (${uniGPA})`);
        } else {
            const gap = (uniGPA - studentGPA).toFixed(2);
            reasons.push(`Your GPA (${studentGPA}) is ${gap} points below their average (${uniGPA})`);
        }
        
        // SAT comparison
        if (profile.sat && university.satRange) {
            const studentSAT = profile.sat;
            const uniSATLow = university.satLow || 1200;
            const uniSATHigh = university.satHigh || 1600;
            
            if (studentSAT >= uniSATHigh) {
                reasons.push(`Your SAT (${studentSAT}) exceeds their range (${university.satRange})`);
            } else if (studentSAT >= uniSATLow) {
                reasons.push(`Your SAT (${studentSAT}) is within their range (${university.satRange})`);
            } else {
                reasons.push(`Your SAT (${studentSAT}) is below their range (${university.satRange})`);
            }
        }
        
        // Acceptance rate
        if (university.acceptanceRate) {
            reasons.push(`Acceptance rate: ${university.acceptanceRate}%`);
        }
        
        // Match score
        reasons.push(`Match score: ${Math.round(score)}%`);
        
        return reasons.join('. ');
    }
    
    generateRecommendationSummary(recommendations, profile) {
        const { safety, target, reach } = recommendations;
        
        let summary = `Based on your profile (GPA: ${profile.gpa || 'N/A'}, SAT: ${profile.sat || 'N/A'}), `;
        summary += `we found ${safety.length} safety schools, ${target.length} target schools, and ${reach.length} reach schools. `;
        
        // Application strategy
        summary += '\n\nRecommended application strategy:\n';
        summary += `• Apply to 2-3 safety schools (you have strong chances)\n`;
        summary += `• Apply to 3-4 target schools (good match with your profile)\n`;
        summary += `• Apply to 2-3 reach schools (worth trying despite lower odds)\n`;
        
        // Total applications
        const total = 7 + Math.floor(Math.random() * 4); // 7-10 schools
        summary += `\nWe recommend applying to ${total} schools total for the best chances of admission.`;
        
        return summary;
    }
}

module.exports = RecommendationService;