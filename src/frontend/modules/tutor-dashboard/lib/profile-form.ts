export interface ProfileFormSource {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  bio: string | null;
  linkedinUrl: string | null;
}

export interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  linkedin: string;
}

export function buildProfileFormData(
  me: ProfileFormSource | null | undefined,
): ProfileFormData {
  return {
    firstName: me?.firstName ?? "",
    lastName: me?.lastName ?? "",
    phone: me?.phone ?? "",
    bio: me?.bio ?? "",
    linkedin: me?.linkedinUrl ?? "",
  };
}
