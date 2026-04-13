import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password === process.env.APP_PASSWORD) {
    const response = NextResponse.json({ success: true });
    // SetCookie - 24 Stunden gültig
    response.cookies.set("media_studio_auth", password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
    });
    return response;
  }

  return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
}
