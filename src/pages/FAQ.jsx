import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
    {
        question: "What is the first step to study in Canada?",
        answer: "The first step is to research and choose a Designated Learning Institution (DLI) and a program of study. Once you receive a letter of acceptance, you can begin the study permit application process."
    },
    {
        question: "Do I need to prove I have enough money to study in Canada?",
        answer: "Yes, you must prove you have enough money to pay for your tuition fees, living expenses for yourself and any family members who come with you to Canada, and return transportation."
    },
    {
        question: "Can I work in Canada as an international student?",
        answer: "Yes, your study permit will likely allow you to work on-campus or off-campus for up to 20 hours per week during regular academic sessions and full-time during scheduled breaks, like the winter and summer holidays."
    },
    {
        question: "What is a Designated Learning Institution (DLI)?",
        answer: "A DLI is a school approved by a provincial or territorial government to host international students. You must have an acceptance letter from a DLI to apply for a study permit."
    },
    {
        question: "How long does it take to get a study permit?",
        answer: "Processing times vary by country. It's recommended to check the official Immigration, Refugees and Citizenship Canada (IRCC) website for the most up-to-date processing times for your country."
    }
];

export default function FAQ() {
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white py-12 sm:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h1 className="text-4xl font-extrabold sm:text-5xl">Frequently Asked Questions</h1>
                    <p className="mt-4 text-xl text-gray-500 max-w-3xl mx-auto">
                        Find answers to common questions about studying in Canada.
                    </p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, index) => (
                         <AccordionItem key={index} value={`item-${index}`}>
                            <AccordionTrigger className="text-lg text-left">{faq.question}</AccordionTrigger>
                            <AccordionContent className="text-base text-gray-600">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </div>
    );
}