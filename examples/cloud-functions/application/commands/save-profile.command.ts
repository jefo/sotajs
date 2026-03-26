import { z } from "zod";
import { usePort } from "../../../../lib";
import { saveProfilePort } from "../../infrastructure/ports/identity.ports";

/**
 * Command: Сохранить облачный профиль (Link Provider)
 */

const SaveProfileInputSchema = z.object({
  name: z.string().min(1),
  folderId: z.string().min(1),
  oauthToken: z.string().optional(),
  serviceAccountKey: z.string().optional(), // Контент JSON-файла
});

type SaveProfileInput = z.infer<typeof SaveProfileInputSchema>;

export const saveProfileCommand = async (input: SaveProfileInput) => {
  const profile = SaveProfileInputSchema.parse(input);
  const saveProfile = usePort(saveProfilePort);

  await saveProfile(profile);
  return { success: true };
};
