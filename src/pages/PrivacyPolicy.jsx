import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 sm:p-10 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-6">Last Updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-lg max-w-none text-gray-700">
            <p>This Privacy Policy describes how GreenPass Group ("GreenPass", "we", "us", or "our") collects, uses, and shares information about you when you use our Services.</p>

            <h2>1. Information We Collect</h2>
            <ul>
              <li><strong>Information You Provide:</strong> This includes personal details you provide during registration (name, email, date of birth, nationality), profile information, academic history, documents you upload (transcripts, passports), and communications on the platform.</li>
              <li><strong>Information from Third Parties:</strong> We may receive information about you from other users, such as agents who refer you or schools that update your application status.</li>
              <li><strong>Usage Information:</strong> We automatically collect information about your interactions with our Services, including IP address, browser type, device information, and pages you visit.</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Provide, maintain, and improve our Services.</li>
              <li>Facilitate connections between students, schools, agents, tutors, and vendors.</li>
              <li>Process transactions and applications.</li>
              <li>Communicate with you, including for marketing and support purposes.</li>
              <li>Ensure the security and integrity of our platform.</li>
              <li>Comply with legal obligations.</li>
            </ul>

            <h2>3. How We Share Your Information</h2>
            <p>Your information is shared in the following ways:</p>
            <ul>
              <li><strong>With other users:</strong> Depending on your role, we share your information to facilitate the core purpose of the platform. For example, a student's profile is shared with an agent they work with or a school they apply to. A vendor's service details are public.</li>
              <li><strong>With Service Providers:</strong> We use third-party vendors for payment processing, cloud hosting, and other services. They have access to your information only to perform these tasks on our behalf.</li>
              <li><strong>For Legal Reasons:</strong> We may disclose your information if required by law or to protect the rights, property, or safety of GreenPass, our users, or others.</li>
            </ul>
            
            <h2>4. Data Security</h2>
            <p>We implement technical and administrative measures to protect your information. However, no system is 100% secure, and we cannot guarantee the absolute security of your data.</p>

            <h2>5. Your Rights and Choices</h2>
            <p>You may access, update, or correct your profile information at any time. Depending on your location, you may have additional rights, such as the right to delete your account or restrict data processing. You can manage your communication preferences in your account settings.</p>

            <h2>6. International Data Transfers</h2>
            <p>Your information may be transferred to, and processed in, countries other than the one you reside in. We take appropriate safeguards to protect your information in accordance with this Privacy Policy.</p>
            
            <h2>7. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact our Data Protection Officer through our support channels.</p>
          </div>
        </div>
      </div>
    </div>
  );
}