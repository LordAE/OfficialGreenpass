import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Building, CheckCircle, AlertTriangle } from 'lucide-react';
import { Institution } from '@/api/entities';

const sampleInstitutions = [
  // ... keep your sampleInstitutions array exactly as you have it
];

export default function InstitutionDataSeeder() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState(null);

  const safeMsg = (err) => {
    if (!err) return 'Unknown error';
    if (typeof err === 'string') return err;
    return err.message || err.error || JSON.stringify(err);
  };

  const seedInstitutions = useCallback(async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    setResult(null);

    const rows = [];
    let created = 0;
    let updated = 0;

    try {
      for (const institutionData of sampleInstitutions) {
        try {
          // Check if it already exists by name + city (adjust matching logic to your schema)
          const existing = await Institution.filter({
            name: institutionData.name,
            city: institutionData.city
          });

          if (Array.isArray(existing) && existing.length > 0) {
            const inst = existing[0];
            await Institution.update(inst.id, institutionData);
            updated += 1;
            rows.push({ ok: true, action: 'updated', name: institutionData.name });
          } else {
            await Institution.create(institutionData);
            created += 1;
            rows.push({ ok: true, action: 'created', name: institutionData.name });
          }
        } catch (err) {
          rows.push({ ok: false, action: 'error', name: institutionData.name, error: safeMsg(err) });
        }

        // Gentle pacing to avoid rate limits
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 120));
      }

      setResult({
        success: true,
        summary: `Created ${created}, updated ${updated}, total ${rows.length}`,
        rows
      });
    } catch (err) {
      setResult({
        success: false,
        summary: 'Seeding failed',
        rows: [{ ok: false, action: 'fatal', name: '—', error: safeMsg(err) }]
      });
    } finally {
      setIsSeeding(false);
    }
  }, [isSeeding]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          Institution Data Seeder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-2">
          Use this tool to add sample institution data into the database.
        </p>
        <p className="text-sm text-gray-500 mb-4">
          This will upsert {sampleInstitutions.length} institution records (no duplicates).
        </p>

        {result && (
          <div
            className={`mb-4 p-3 rounded-lg flex items-start gap-2 ${
              result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {result.success ? (
              <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className="font-medium">{result.summary}</p>
              <ul className="mt-2 space-y-1 text-sm max-h-48 overflow-auto pr-1">
                {result.rows.map((r, i) => (
                  <li key={`${r.name}-${i}`}>
                    {r.ok ? '✓' : '✗'} <span className="font-medium">{r.name}</span> — {r.action}
                    {!r.ok && r.error ? `: ${r.error}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <Button
          onClick={seedInstitutions}
          disabled={isSeeding}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          {isSeeding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isSeeding ? 'Seeding…' : 'Seed Institution Data'}
        </Button>
      </CardContent>
    </Card>
  );
}
