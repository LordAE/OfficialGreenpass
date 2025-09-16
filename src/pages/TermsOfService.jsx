import React from 'react';

export default function TermsOfService() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 sm:p-10 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-6">Last Updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-lg max-w-none text-gray-700">
            <h2>1. Introduction</h2>
            <p>Welcome to GreenPass! These Terms of Service ("Terms") govern your access to and use of our website, applications, and services (collectively, the "Services"). By using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, you may not use our Services.</p>

            <h2>2. The GreenPass Platform</h2>
            <p>GreenPass is a comprehensive platform connecting students with educational institutions, agents, tutors, and vendors to facilitate international education. Our Services include school discovery, program applications, visa assistance, tutoring, and a marketplace for related services.</p>

            <h2>3. User Roles and Obligations</h2>
            <ul>
              <li><strong>Students/Users:</strong> You are responsible for providing accurate information and for your conduct on the platform. You agree to use the Services for their intended purpose and to communicate respectfully.</li>
              <li><strong>Agents:</strong> You agree to provide ethical, accurate, and professional guidance to students in accordance with our Agent Agreement and all applicable laws.</li>
              <li><strong>Tutors:</strong> You agree to provide high-quality, professional tutoring services and to maintain the confidentiality of student information.</li>
              <li><strong>Schools:</strong> You are responsible for keeping your institutional and program information accurate and up-to-date.</li>
              <li><strong>Vendors:</strong> You agree to deliver the services listed on our marketplace reliably, professionally, and as described.</li>
            </ul>

            <h2>4. Account Registration and Security</h2>
            <p>You must create an account to access most features. You are responsible for safeguarding your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use.</p>

            <h2>5. Payments, Commissions, and Refunds</h2>
            <p>Certain Services require payment. You agree to pay all applicable fees and authorize us and our third-party payment processors to charge your payment method. Commissions for agents and tutors are governed by their respective agreements. Refund policies are specific to each service and will be clearly disclosed at the time of purchase.</p>
            
            <h2>6. User Content and Conduct</h2>
            <p>You are solely responsible for any content you post. You agree not to post content that is illegal, fraudulent, infringing, or harmful. We reserve the right to remove any content and terminate accounts that violate these terms.</p>

            <h2>7. Intellectual Property</h2>
            <p>All content and materials on GreenPass, including our brand, code, and design, are the intellectual property of GreenPass Group and are protected by law. You may not use our intellectual property without our prior written consent.</p>

            <h2>8. Disclaimers and Limitation of Liability</h2>
            <p>The Services are provided "as is" without warranties of any kind. GreenPass is a platform provider; we are not responsible for the actions of our users (students, agents, tutors, etc.). Our liability to you is limited to the amount you have paid to us in the 12 months preceding the claim or $100, whichever is greater.</p>

            <h2>9. Termination</h2>
            <p>We may suspend or terminate your access to the Services at any time, for any reason, including for violation of these Terms.</p>

            <h2>10. Governing Law</h2>
            <p>These Terms shall be governed by the laws of the jurisdiction in which GreenPass Group is incorporated, without regard to its conflict of law provisions.</p>

            <h2>11. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. We will provide notice of significant changes. Your continued use of the Services after such changes constitutes your acceptance of the new Terms.</p>
            
            <h2>12. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us through the support channels provided on our website.</p>
          </div>
        </div>
      </div>
    </div>
  );
}