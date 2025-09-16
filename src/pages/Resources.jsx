import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Link as LinkIcon, Download } from 'lucide-react';

const resources = [
    { title: 'Study Permit Application Guide', description: 'A step-by-step guide to help you through the Canadian study permit application process.', type: 'guide', link: '#' },
    { title: 'Pre-Departure Checklist', description: 'Everything you need to do before you leave for Canada.', type: 'checklist', link: '#' },
    { title: 'IRCC Official Website', description: 'The official source for all Canadian immigration information.', type: 'external', link: 'https://www.canada.ca/en/immigration-refugees-citizenship.html' },
    { title: 'EduCanada', description: 'The official Government of Canada resource for international students.', type: 'external', link: 'https://www.educanada.ca/' },
];

const ResourceCard = ({ resource }) => (
    <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                {resource.title}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-gray-600 mb-4">{resource.description}</p>
            <a href={resource.link} target="_blank" rel="noopener noreferrer" className="text-green-600 font-semibold inline-flex items-center">
                {resource.type === 'external' ? 'Visit Website' : 'Download Guide'}
                {resource.type === 'external' ? <LinkIcon className="h-4 w-4 ml-2" /> : <Download className="h-4 w-4 ml-2" />}
            </a>
        </CardContent>
    </Card>
);

export default function Resources() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white py-12 sm:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-extrabold sm:text-5xl">Resource Center</h1>
                    <p className="mt-4 text-xl text-gray-500 max-w-3xl mx-auto">
                        Helpful guides, checklists, and links to support your journey.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid md:grid-cols-2 gap-8">
                    {resources.map((res, index) => (
                        <ResourceCard key={index} resource={res} />
                    ))}
                </div>
            </div>
        </div>
    );
}