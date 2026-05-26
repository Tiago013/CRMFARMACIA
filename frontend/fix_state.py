import sys

file_path = r"c:\Users\santi\Downloads\CRMFARMAIA\frontend\src\app\(dashboard)\crm\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Pull fetchPatients OUT of useEffect and map missing fields
old_fetch = """  // Fetch Patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await api.get('/crm/patients', { params: { limit: 50, search: searchQuery } });
        const data = Array.isArray(res.data) ? res.data : [];
        const mapped = data.map((p: any) => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`.trim() || p.first_name,
          phone: p.phone || '',
          lastVisit: p.last_purchase_date || 'N/A',
          tags: Array.from(new Set([...(p.preferences?.condiciones ? p.preferences.condiciones.split(';').filter(Boolean) : []), ...(p.tags || []), p.segment].filter(Boolean))),
          ltv: p.ltv || 0,
          segment: p.segment || 'Regular',
          initials: `${(p.first_name || '')[0] || ''}${(p.last_name || '')[0] || ''}`.toUpperCase(),
          preferences: p.preferences || {},
          score: 0, // Will be loaded with full profile
          purchase_history: [],
          timeline: [],
          chart_data: []
        }));
        setPatients(mapped);
        if (!selectedPatientId && mapped.length > 0) setSelectedPatientId(mapped[0].id);
      } catch (e) {
        console.error('Error cargando pacientes:', e);
      }
    };
    const timeout = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);"""

new_fetch = """  // Fetch Patients
  const fetchPatients = async (query: string = searchQuery) => {
    try {
      const res = await api.get('/crm/patients', { params: { limit: 50, search: query } });
      const data = Array.isArray(res.data) ? res.data : [];
      const mapped = data.map((p: any) => ({
        id: p.id,
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        document_id: p.document_id || '',
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.first_name,
        phone: p.phone || '',
        lastVisit: p.last_purchase_date || 'N/A',
        tags: Array.from(new Set([...(p.preferences?.condiciones ? p.preferences.condiciones.split(';').filter(Boolean) : []), ...(p.tags || []), p.segment].filter(Boolean))),
        ltv: p.ltv || 0,
        segment: p.segment || 'Regular',
        initials: `${(p.first_name || '')[0] || ''}${(p.last_name || '')[0] || ''}`.toUpperCase(),
        preferences: p.preferences || {},
        score: 0,
        purchase_history: [],
        timeline: [],
        chart_data: []
      }));
      setPatients(mapped);
      return mapped;
    } catch (e) {
      console.error('Error cargando pacientes:', e);
      return [];
    }
  };

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const mapped = await fetchPatients(searchQuery);
      if (!selectedPatientId && mapped.length > 0) setSelectedPatientId(mapped[0].id);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);"""

content = content.replace(old_fetch, new_fetch)

# 2. Update fetchPatientProfile to merge missing fields
old_profile = """              ...p,
              score: res.data.score || 50,
              purchase_history: res.data.purchase_history || [],
              timeline: res.data.timeline || [],
              chart_data: res.data.chart_data || [],
              ltv: res.data.ltv || p.ltv"""

new_profile = """              ...p,
              first_name: res.data.first_name || p.first_name,
              last_name: res.data.last_name || p.last_name,
              document_id: res.data.document_id || p.document_id,
              phone: res.data.phone || p.phone,
              preferences: res.data.preferences || p.preferences,
              score: res.data.score || 50,
              purchase_history: res.data.purchase_history || [],
              timeline: res.data.timeline || [],
              chart_data: res.data.chart_data || [],
              ltv: res.data.ltv || p.ltv"""
content = content.replace(old_profile, new_profile)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed state and fetch scoping.")
