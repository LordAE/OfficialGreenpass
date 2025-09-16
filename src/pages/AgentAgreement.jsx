import React from 'react';

export default function AgentAgreement() {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 sm:p-10 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Professional Agent Agreement</h1>
          <p className="text-sm text-gray-500 mb-6">Last Updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-lg max-w-none text-gray-700">
            <p>This Professional Agent Agreement ("Agreement") is made between GreenPass Group ("GreenPass") and you ("Agent"). This Agreement governs your participation as an agent on the GreenPass platform.</p>

            <h2>1. Role and Responsibilities</h2>
            <p>As an Agent, you agree to act as an independent contractor to guide and assist students using the GreenPass platform. Your responsibilities include:</p>
            <ul>
              <li>Providing accurate and ethical advice to students regarding educational opportunities.</li>
              <li>Assisting students with the application process for schools and visas.</li>
              <li>Maintaining professional and timely communication with students and GreenPass administrators.</li>
              <li>Adhering to the highest standards of professional conduct and complying with all applicable laws and regulations.</li>
            </ul>

            <h2>2. Compensation and Commissions</h2>
            <p>You will be compensated based on commissions earned from successful student placements and other services as outlined in the "Agent Earnings" section of your dashboard. Commission rates are subject to change with 30 days' notice. Payouts will be processed according to the terms specified in the platform's payment policy.</p>

            <h2>3. Confidentiality</h2>
            <p>You will have access to confidential student information. You agree to maintain the strict confidentiality of this information and use it solely for the purpose of providing services under this Agreement.</p>
            
            <h2>4. Independent Contractor Status</h2>
            <p>You are an independent contractor, not an employee of GreenPass. You are not eligible for any employee benefits and are solely responsible for your own taxes.</p>

            <h2>5. Term and Termination</h2>
            <p>This Agreement is effective upon your acceptance and continues until terminated. Either party may terminate this Agreement at any time with written notice. Upon termination, you must cease all activities as an Agent and return any confidential information.</p>

            <h2>6. Representations and Warranties</h2>
            <p>You represent that you have the necessary qualifications, licenses, and experience to provide the services outlined in this Agreement and that you will not misrepresent your credentials or the services of GreenPass.</p>
            
            <h2>7. Indemnification</h2>
            <p>You agree to indemnify and hold harmless GreenPass from any claims, damages, or losses arising from your breach of this Agreement or your negligence or misconduct.</p>
          </div>
        </div>
      </div>
    </div>
  );
}