import type { MockDb } from "./types";

export const seedDb = (): MockDb => {
  const now = Date.now();

  return {
    users: [
      {
        id: "u_customer_1",
        email: "customer@example.com",
        password: "password",
        name: "Demo Customer",
        role: "customer",
      },
      {
        id: "u_manager_1",
        email: "manager@example.com",
        password: "password",
        name: "Demo Manager",
        role: "manager",
      },
    ],
    quotes: [],
    bookings: [],
    feedback: [],
    availability: [
      {
        id: "av_1",
        employeeName: "Driver A",
        dateISO: new Date(now + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        startTime: "09:00",
        endTime: "17:00",
      },
    ],
    timeSlots: [],
    inventory: [
      { id: "inv_1", name: "Moving blankets", quantity: 20, unit: "pcs" },
      { id: "inv_2", name: "Dollies", quantity: 4, unit: "pcs" },
      { id: "inv_3", name: "Wardrobe boxes", quantity: 10, unit: "pcs" },
    ],
    activeUserId: "u_customer_1",
  };
};
