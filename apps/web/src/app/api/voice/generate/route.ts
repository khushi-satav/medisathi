import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import textToSpeech from '@google-cloud/text-to-speech';

const ttsClient = new textToSpeech.TextToSpeechClient();

export async function POST(req: NextRequest) {
  try {
    requireAuth(req);
    const { text, languageCode = 'en-US' } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const request = {
      input: { text: text },
      voice: { languageCode: languageCode, name: `${languageCode}-Journey-O` }, 
      audioConfig: { audioEncoding: 'MP3' as const },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    
    // Return base64 audio
    const audioBase64 = response.audioContent?.toString('base64');

    return NextResponse.json({ audioBase64 });
  } catch (error: any) {
    console.error('Voice Generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
