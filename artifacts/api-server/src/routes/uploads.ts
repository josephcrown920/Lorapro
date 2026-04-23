import { Router, type IRouter } from "express";
import { PresignUploadBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/uploads/presign", async (req, res) => {
  const parsed = PresignUploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  res.status(501).json({
    error:
      "Direct upload not configured. Please provide a publicly accessible ZIP URL instead.",
  });
});

export default router;
