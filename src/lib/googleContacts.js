import { clearCachedContactsAccessToken } from "../firebase";

const PEOPLE_BASE = "https://people.googleapis.com/v1";
const PERSON_FIELDS = "names,phoneNumbers,emailAddresses,organizations,addresses,biographies,photos";

function normalizeGooglePerson(person) {
  if (!person) return null;
  const primaryName = person.names?.[0];
  const primaryOrg = person.organizations?.[0];
  const primaryPhone = person.phoneNumbers?.[0]?.value || "";
  const primaryEmail = person.emailAddresses?.[0]?.value || "";
  const primaryAddress = person.addresses?.[0]?.formattedValue || "";
  const primaryBio = person.biographies?.[0]?.value || "";
  const primaryPhoto = person.photos?.find((p) => !p.default)?.url || person.photos?.[0]?.url || "";

  const nombre = (
    primaryName?.displayName ||
    [primaryName?.givenName, primaryName?.familyName].filter(Boolean).join(" ") ||
    primaryOrg?.name ||
    primaryEmail ||
    primaryPhone ||
    ""
  ).trim();

  if (!nombre) return null;

  const orgTexto = [primaryOrg?.name, primaryOrg?.title].filter(Boolean).join(" · ").toLowerCase();
  const nombreLower = nombre.toLowerCase();
  const bioLower = primaryBio.toLowerCase();
  const esMedico =
    /(dr\.|dra\.|doctor|doctora|consultorio|cl[ií]nica|hospital|m[eé]dic|salud|ur[oó]log|cardi[oó]log|odont[oó]log|dermat[oó]log|pediatr|ginec[oó]log|laboratorio|farmacia)/.test(
      `${nombreLower} ${orgTexto} ${bioLower}`
    );

  return {
    googleResourceName: person.resourceName || "",
    googleEtag: person.etag || "",
    nombre,
    categoria: esMedico ? "Médico / Consultorio" : "Personal",
    especialidad: primaryOrg?.title || "",
    organizacion: primaryOrg?.name || "",
    telefono: primaryPhone.trim(),
    email: primaryEmail.trim(),
    direccion: primaryAddress.trim(),
    notas: primaryBio.trim(),
    fotoUrl: primaryPhoto,
  };
}

function buildPersonPayload(contacto) {
  const nombre = (contacto.nombre || "").trim();
  const parts = nombre.split(/\s+/);
  const givenName = parts[0] || nombre;
  const familyName = parts.length > 1 ? parts.slice(1).join(" ") : "";

  const payload = {
    names: [{ givenName, ...(familyName ? { familyName } : {}) }],
  };

  if (contacto.telefono && contacto.telefono.trim()) {
    payload.phoneNumbers = [{ value: contacto.telefono.trim(), type: "work" }];
  }
  if (contacto.email && contacto.email.trim()) {
    payload.emailAddresses = [{ value: contacto.email.trim(), type: "work" }];
  }
  if ((contacto.organizacion && contacto.organizacion.trim()) || (contacto.especialidad && contacto.especialidad.trim())) {
    payload.organizations = [
      {
        name: (contacto.organizacion || "").trim() || undefined,
        title: (contacto.especialidad || "").trim() || undefined,
      },
    ];
  }
  if (contacto.direccion && contacto.direccion.trim()) {
    payload.addresses = [{ formattedValue: contacto.direccion.trim(), type: "work" }];
  }

  const notasPartes = [];
  if (contacto.categoria && contacto.categoria !== "Personal") {
    notasPartes.push(`Categoría: ${contacto.categoria}`);
  }
  if (contacto.horario && contacto.horario.trim()) {
    notasPartes.push(`Horario: ${contacto.horario.trim()}`);
  }
  if (contacto.notas && contacto.notas.trim()) {
    notasPartes.push(contacto.notas.trim());
  }
  if (notasPartes.length > 0) {
    payload.biographies = [{ value: notasPartes.join("\n"), contentType: "TEXT_PLAIN" }];
  }

  return payload;
}

async function handleApiResponse(res) {
  if (res.status === 401 || res.status === 403) {
    clearCachedContactsAccessToken();
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody?.error?.message || "Tu sesión con Google Contacts expiró o no tiene permisos.";
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Error de Google Contacts (HTTP ${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function fetchGoogleContacts(accessToken) {
  if (!accessToken) throw new Error("Falta el token de acceso de Google Contacts.");

  const all = [];
  let pageToken = "";
  let pages = 0;

  do {
    const url = new URL(`${PEOPLE_BASE}/people/me/connections`);
    url.searchParams.set("personFields", PERSON_FIELDS);
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("sortOrder", "FIRST_NAME_ASCENDING");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await handleApiResponse(res);

    const connections = Array.isArray(data?.connections) ? data.connections : [];
    for (const p of connections) {
      const normalized = normalizeGooglePerson(p);
      if (normalized) all.push(normalized);
    }

    pageToken = data?.nextPageToken || "";
    pages += 1;
  } while (pageToken && pages < 5);

  return all;
}

export async function createGoogleContact(accessToken, contacto) {
  if (!accessToken) throw new Error("Falta el token de acceso de Google Contacts.");
  const payload = buildPersonPayload(contacto);
  const res = await fetch(`${PEOPLE_BASE}/people:createContact?personFields=${encodeURIComponent(PERSON_FIELDS)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const created = await handleApiResponse(res);
  return {
    googleResourceName: created?.resourceName || "",
    googleEtag: created?.etag || "",
  };
}

export async function updateGoogleContact(accessToken, resourceName, contacto) {
  if (!accessToken) throw new Error("Falta el token de acceso de Google Contacts.");
  if (!resourceName) throw new Error("El contacto no tiene identificador de Google Contacts.");

  // Obtenemos primero el etag actual para evitar conflictos de concurrencia
  const currentRes = await fetch(
    `${PEOPLE_BASE}/${resourceName}?personFields=${encodeURIComponent(PERSON_FIELDS)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const currentPerson = await handleApiResponse(currentRes);

  const payload = {
    ...buildPersonPayload(contacto),
    etag: currentPerson?.etag || contacto.googleEtag,
  };

  const updateFields = "names,phoneNumbers,emailAddresses,organizations,addresses,biographies";
  const patchRes = await fetch(
    `${PEOPLE_BASE}/${resourceName}:updateContact?updatePersonFields=${encodeURIComponent(updateFields)}&personFields=${encodeURIComponent(PERSON_FIELDS)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );
  const updated = await handleApiResponse(patchRes);
  return {
    googleResourceName: updated?.resourceName || resourceName,
    googleEtag: updated?.etag || "",
  };
}

export async function deleteGoogleContact(accessToken, resourceName) {
  if (!accessToken) throw new Error("Falta el token de acceso de Google Contacts.");
  if (!resourceName) return;
  const res = await fetch(`${PEOPLE_BASE}/${resourceName}:deleteContact`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await handleApiResponse(res);
}
