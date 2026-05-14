import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const drug = searchParams.get('drug');

  if (!drug) {
    return NextResponse.json({ error: 'Drug name is required' }, { status: 400 });
  }

  try {
    // Try generic name first
    let res = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(drug)}"&limit=1`);
    
    // If not found, try brand name
    if (!res.ok) {
      res = await fetch(`https://api.fda.gov/drug/label.json?search=openfda.brand_name:"${encodeURIComponent(drug)}"&limit=1`);
    }

    if (!res.ok) {
      // Fallback to Gemini if FDA fails (especially for Indian brand names)
      const { generateText } = await import('@/server/services/gemini');
      const prompt = `Provide medical information for the drug "${drug}".
Return ONLY valid JSON with this structure:
{
  "interactions": "brief description of drug interactions",
  "sideEffects": "brief description of common side effects",
  "warnings": "brief description of warnings"
}`;
      
      try {
        const aiText = await generateText(prompt);
        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aiData = JSON.parse(jsonMatch[0]);
          return NextResponse.json({
            name: drug,
            interactions: aiData.interactions || 'No major interactions listed.',
            sideEffects: aiData.sideEffects || 'No specific side effects listed.',
            warnings: aiData.warnings || 'No major warnings.'
          });
        }
      } catch (aiErr) {
        console.error('Gemini fallback failed:', aiErr);
      }
      return NextResponse.json({ error: 'Drug not found in FDA database and AI fallback failed' }, { status: 404 });
    }

    const data = await res.json();
    const drugData = data.results[0];

    const interactions = drugData.drug_interactions?.[0] || 'No major interactions listed.';
    const sideEffects = drugData.adverse_reactions?.[0] || 'No specific side effects listed.';
    const warnings = drugData.warnings?.[0] || 'No major warnings.';

    return NextResponse.json({
      name: drug,
      interactions: interactions.substring(0, 300) + (interactions.length > 300 ? '...' : ''),
      sideEffects: sideEffects.substring(0, 300) + (sideEffects.length > 300 ? '...' : ''),
      warnings: warnings.substring(0, 300) + (warnings.length > 300 ? '...' : '')
    });
  } catch (error) {
    console.error('FDA API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch drug info' }, { status: 500 });
  }
}
