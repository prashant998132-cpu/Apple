// app/api/social/route.ts — Social Media Posting
// Meta (Instagram/Facebook) + Twitter/X
import { NextRequest, NextResponse } from 'next/server';

async function postInstagram(caption: string, imageUrl: string, token: string, userId: string) {
  // Step 1: Create container
  const cr = await fetch(`https://graph.instagram.com/v21.0/${userId}/media`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, caption, access_token: token })
  });
  if (!cr.ok) throw new Error('IG container: ' + await cr.text());
  const { id: containerId } = await cr.json();

  // Step 2: Publish
  const pub = await fetch(`https://graph.instagram.com/v21.0/${userId}/media_publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: containerId, access_token: token })
  });
  if (!pub.ok) throw new Error('IG publish: ' + await pub.text());
  const { id } = await pub.json();
  return { success: true, platform: 'Instagram', postId: id, postUrl: `https://www.instagram.com/p/${id}/` };
}

async function postFacebook(message: string, token: string, pageId: string, imageUrl?: string) {
  const body: any = { message, access_token: token };
  if (imageUrl) body.link = imageUrl;
  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('FB: ' + await res.text());
  const { id } = await res.json();
  return { success: true, platform: 'Facebook', postId: id };
}

async function postTwitter(text: string, token: string) {
  const res = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('Twitter: ' + await res.text());
  const { data } = await res.json();
  return { success: true, platform: 'Twitter/X', postId: data.id,
    postUrl: `https://twitter.com/i/web/status/${data.id}` };
}

export async function POST(req: NextRequest) {
  try {
    const { platform, content, imageUrl, token, userId, pageId } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 });
    if (!token) return NextResponse.json({ error: 'token required — Settings mein connect karo' }, { status: 401 });

    switch (platform) {
      case 'instagram':
        if (!userId) return NextResponse.json({ error: 'IG user ID required' }, { status: 400 });
        if (!imageUrl) return NextResponse.json({ error: 'Instagram ko image chahiye' }, { status: 400 });
        return NextResponse.json(await postInstagram(content, imageUrl, token, userId));
      case 'facebook':
        if (!pageId) return NextResponse.json({ error: 'FB page ID required' }, { status: 400 });
        return NextResponse.json(await postFacebook(content, token, pageId, imageUrl));
      case 'twitter':
        return NextResponse.json(await postTwitter(content, token));
      default:
        return NextResponse.json({ error: 'platform: instagram | facebook | twitter' }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
