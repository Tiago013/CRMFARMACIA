export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const model = url.searchParams.get('model') || 'gemini';
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        sales: {
          include: {
            items: {
              include: {
                product: {
                  include: {
                    category: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Generate AI recommendations based on past purchases
    let recommendations: any[] = [];
    
    // Find categories they bought
    const boughtCategories = new Set<string>();
    const boughtProducts = new Set<string>();
    
    patient.sales.forEach(sale => {
      sale.items.forEach(item => {
        boughtProducts.add(item.product.id);
        if (item.product.category) boughtCategories.add(item.product.category.name);
      });
    });

    const apiKey = process.env.GEMINI_API_KEY || '';

    const prompt = `Eres un asistente de Inteligencia Artificial para una farmacia. Analiza el perfil médico de este paciente:
    - Nombre: ${patient.first_name} ${patient.last_name}
    - EPS: ${patient.eps || 'Ninguna'}
    - Alergias: ${patient.allergies || 'Ninguna'}
    - Condiciones médicas: ${patient.tags.join(', ')}
    - Compras recientes de categorías: ${Array.from(boughtCategories).join(', ')}

    Debes devolver un JSON con una lista de recomendaciones de productos que el farmacéutico podría ofrecerle (cross-selling o mejora de salud).
    La respuesta debe ser EXACTAMENTE este formato JSON (sin texto adicional ni markdown \`\`\`json \`\`\`):
    [
      {
        "product_name": "Nombre corto del producto",
        "confidence_score": 0.95,
        "reason": "Razón corta de por qué se recomienda (basado en sus compras o alergias)",
        "search_query": "Término corto de búsqueda para el POS (ej. ibuprofeno)"
      }
    ]
    Devuelve máximo 2 recomendaciones.`;

    let rawText = '';

    if (model === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY no está configurada');
      }
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Gemini API Error:", errText);
        // Fallback si hay error de cuota o red
        return NextResponse.json({ 
          recommendations: [
            {
              product_name: 'Vitamina C',
              confidence_score: 0.60,
              reason: 'Límite de la API de IA alcanzado. Recomendación preventiva por defecto.',
              search_query: 'vitamina c'
            }
          ] 
        });
      }

      const result = await response.json();
      rawText = result.candidates[0].content.parts[0].text;
    } else {
      // Local Ollama
      const response = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          format: 'json',
          stream: false,
          options: {
            temperature: 0.2
          }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Ollama API Error:", errText);
        return NextResponse.json({ 
          recommendations: [
            {
              product_name: 'Vitamina C',
              confidence_score: 0.60,
              reason: `Error conectando al modelo local '${model}'. Verifica que Ollama esté corriendo y el modelo descargado.`,
              search_query: 'vitamina c'
            }
          ] 
        });
      }

      const result = await response.json();
      rawText = result.response;
    }
    
    // Clean up markdown code blocks if Gemini returns them
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      recommendations = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Error parsing Gemini JSON:", rawText);
      // Fallback if parsing fails
      recommendations = [
        {
          product_name: 'Vitamina C',
          confidence_score: 0.65,
          reason: 'Mejora del sistema inmunológico general.',
          search_query: 'vitamina c'
        }
      ];
    }

    return NextResponse.json({ recommendations });
  } catch (error: any) {
    return NextResponse.json({ 
      recommendations: [
        {
          product_name: 'Vitamina C',
          confidence_score: 0.60,
          reason: 'Error de conexión. Recomendación preventiva por defecto.',
          search_query: 'vitamina c'
        }
      ] 
    });
  }
}
