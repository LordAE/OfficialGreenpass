import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, BookOpen, DollarSign } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function SchoolCard({ school, variant = "grid" }) {
    const formatTuition = (tuition) => {
        if (!tuition) return "Contact for pricing";
        return `$${tuition.toLocaleString()}/year`;
    };

    const getSchoolTags = () => {
        const tags = [];
        if (school.isPublic) tags.push("Public");
        if (school.hasCoop) tags.push("Co-op");
        if (school.isDLI) tags.push("DLI");
        return tags.concat(school.tags || []).slice(0, 3);
    };

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className={variant === "carousel" ? "flex-shrink-0 w-72" : ""}
        >
            <Card className="h-full bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 flex flex-col h-full">
                    {/* School Logo and Name */}
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {school.logoUrl ? (
                                <img 
                                    src={school.logoUrl} 
                                    alt={`${school.name} logo`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <BookOpen className="w-8 h-8 text-gray-400" />
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 leading-tight">
                                {school.name}
                            </h3>
                            <div className="flex items-center text-sm text-gray-600">
                                <MapPin className="h-4 w-4 mr-1 text-green-600 flex-shrink-0" />
                                <span className="truncate">{school.city}, {school.province}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-4">
                        {getSchoolTags().map((tag, index) => (
                            <Badge 
                                key={index} 
                                variant="secondary" 
                                className="text-xs bg-green-50 text-green-700 border-green-200"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>

                    {/* Stats */}
                    <div className="space-y-2 mb-6 flex-grow">
                        {school.programCount > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Programs</span>
                                <span className="font-medium text-gray-900">{school.programCount}+</span>
                            </div>
                        )}
                        {school.avgTuition && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Avg. Tuition</span>
                                <span className="font-medium text-gray-900">{formatTuition(school.avgTuition)}</span>
                            </div>
                        )}
                    </div>

                    {/* CTA Button */}
                    <div className="mt-auto">
                        <Link to={createPageUrl(`Programs?school=${encodeURIComponent(school.name)}`)}>
                            <Button className="w-full bg-[#0a3d34] hover:bg-[#134d41]">
                                Explore School
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}