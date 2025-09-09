// src/pages/api/contact.ts
import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    const ct = request.headers.get("content-type") || "";
    let name = "", email = "", message = "";

  // --- Parsers robustos (como ya tenías) ---
    const tryMultipart = async () => {
        try {
            const fd = await request.clone().formData();
            return {
                name: fd.get("name")?.toString() || "",
                email: fd.get("email")?.toString() || "",
                message: fd.get("message")?.toString() || "",
            };
        } catch { return null; }
    };
    const tryUrlencoded = async () => {
        try {
            const txt = await request.clone().text();
            if (!txt) return null;
            const p = new URLSearchParams(txt);
            return {
                name: p.get("name") || "",
                email: p.get("email") || "",
                message: p.get("message") || "",
            };
        } catch { return null; }
    };
    const tryJson = async () => {
        try {
            const body = await request.clone().json();
            return {
                name: (body?.name as string) || "",
                email: (body?.email as string) || "",
                message: (body?.message as string) || "",
            };
        } catch { return null; }
    };

    if (ct.includes("application/json")) {
        ({ name, email, message } = (await tryJson()) || { name:"", email:"", message:"" });
    } else if (ct.includes("application/x-www-form-urlencoded")) {
        ({ name, email, message } = (await tryUrlencoded()) || { name:"", email:"", message:"" });
    } else if (ct.includes("multipart/form-data")) {
        ({ name, email, message } = (await tryMultipart()) || { name:"", email:"", message:"" });
    } else {
        ({ name, email, message } =
            (await tryMultipart()) || (await tryUrlencoded()) || (await tryJson()) ||
            { name:"", email:"", message:"" });
    }

    if (!name || !email || !message) {
        return new Response(JSON.stringify({ error: "Todos los campos son obligatorios" }), { status: 400 });
    }

    // --- Chequeo de variables de entorno ---
    const SMTP_USER = import.meta.env.SMTP_USER;
    const SMTP_PASS = import.meta.env.SMTP_PASS;
    const SMTP_HOST = import.meta.env.SMTP_HOST || "smtp.gmail.com"; // por si quieres definirlo en .env
    const SMTP_PORT = Number(import.meta.env.SMTP_PORT || 465);
    const SMTP_SECURE = (import.meta.env.SMTP_SECURE ?? "true") === "true";

    if (!SMTP_USER || !SMTP_PASS) {
        console.error("[SMTP] Faltan variables. USER:", SMTP_USER, "PASS:", !!SMTP_PASS);
        return new Response(JSON.stringify({ error: "Config SMTP incompleta en el servidor" }), { status: 500 });
    } 

    try {
        const transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_SECURE, // true para 465, false para 587
            auth: { user: SMTP_USER, pass: SMTP_PASS },
            // Opcional: aumenta tolerancia de tiempo
            connectionTimeout: 20_000,
            greetingTimeout: 20_000,
            socketTimeout: 30_000,
        });

        // Verifica conexión/credenciales primero
        await transporter.verify().catch((err:any) => {
            console.error("[SMTP VERIFY ERROR]", {
                code: (err as any)?.code,
                command: (err as any)?.command,
                response: (err as any)?.response,
                message: err?.message,
            });
            throw err;
        });

        await transporter.sendMail({
            from: `"Formulario Web" <${SMTP_USER}>`,
            to: SMTP_USER,
            subject: "Nuevo mensaje de contacto",
            text: `Nombre: ${name}\nCorreo: ${email}\nMensaje:\n${message}`,
        });

        // Redirección si fue submit tradicional
        if ((request.headers.get("sec-fetch-mode") || "") === "navigate") {
            return new Response(null, { status: 303, headers: { Location: "/?sent=1" } });
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (e: any) {
        console.error("[SMTP SEND ERROR]", {
            code: e?.code,
            command: e?.command,
            response: e?.response,
            message: e?.message,
        });
        return new Response(JSON.stringify({ error: "No se pudo enviar el correo" }), { status: 500 });
    }
};
