import assert from "node:assert/strict";
import test from "node:test";

import { buildProfileFormData } from "@/frontend/modules/tutor-dashboard/lib/profile-form";

test("buildProfileFormData mapea los campos de me al shape del formulario", () => {
  const result = buildProfileFormData({
    firstName: "Ana",
    lastName: "Soto",
    phone: "+56911112222",
    bio: "Bio corta",
    linkedinUrl: "https://linkedin.com/in/ana",
  });
  assert.deepEqual(result, {
    firstName: "Ana",
    lastName: "Soto",
    phone: "+56911112222",
    bio: "Bio corta",
    linkedin: "https://linkedin.com/in/ana",
  });
});

test("buildProfileFormData convierte campos null a strings vacíos", () => {
  const result = buildProfileFormData({
    firstName: "Ana",
    lastName: "Soto",
    phone: null,
    bio: null,
    linkedinUrl: null,
  });
  assert.deepEqual(result, {
    firstName: "Ana",
    lastName: "Soto",
    phone: "",
    bio: "",
    linkedin: "",
  });
});

test("buildProfileFormData retorna formulario vacío si me es undefined", () => {
  const result = buildProfileFormData(undefined);
  assert.deepEqual(result, {
    firstName: "",
    lastName: "",
    phone: "",
    bio: "",
    linkedin: "",
  });
});
