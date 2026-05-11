import assert from "node:assert/strict";
import test from "node:test";

import { RolesManagementService } from "@/backend/modules/roles/service/roles-management.service";
import { prisma } from "@/infrastructure/prisma/client";

test(
  "RolesManagementService integration: assigns and removes role using DB",
  async (t) => {
    const unique = Date.now();
    const email = `integration.roles.${unique}@ucn.cl`;

    t.after(async () => {
      await prisma.userRole.deleteMany({ where: { user: { email } } });
      await prisma.user.deleteMany({ where: { email } });
    });

    await prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: {
        name: "ADMIN",
        description: "Admin role for RBAC integration tests",
      },
    });

    await prisma.user.create({
      data: {
        email,
        firstName: "Integration",
        lastName: "Roles",
        isActive: true,
      },
    });

    const service = new RolesManagementService();

    const assigned = await service.assignRoleToUser(email, "ADMIN");
    assert.equal(assigned.roles.includes("ADMIN"), true);
    assert.equal(assigned.permissions.includes("MANAGE_TUTORS"), true);

    const removed = await service.removeRoleFromUser(email, "ADMIN");
    assert.equal(removed.roles.includes("ADMIN"), false);
  }
);
