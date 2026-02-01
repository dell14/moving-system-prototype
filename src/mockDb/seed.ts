import type { MockDb } from "./types";

export const seedDb = (): MockDb => {
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
      // Alex - works weekdays, mornings
      { id: "av_1", employeeName: "Alex", dayOfWeek: "Monday", shift: "morning" },
      { id: "av_2", employeeName: "Alex", dayOfWeek: "Tuesday", shift: "morning" },
      { id: "av_3", employeeName: "Alex", dayOfWeek: "Wednesday", shift: "all_day" },
      { id: "av_4", employeeName: "Alex", dayOfWeek: "Thursday", shift: "morning" },
      { id: "av_5", employeeName: "Alex", dayOfWeek: "Friday", shift: "morning" },
      // Jordan - works evenings and weekends
      { id: "av_6", employeeName: "Jordan", dayOfWeek: "Monday", shift: "evening" },
      { id: "av_7", employeeName: "Jordan", dayOfWeek: "Wednesday", shift: "evening" },
      { id: "av_8", employeeName: "Jordan", dayOfWeek: "Friday", shift: "evening" },
      { id: "av_9", employeeName: "Jordan", dayOfWeek: "Saturday", shift: "all_day" },
      { id: "av_10", employeeName: "Jordan", dayOfWeek: "Sunday", shift: "all_day" },
      // Sam - part-time, Tue/Thu/Sat
      { id: "av_11", employeeName: "Sam", dayOfWeek: "Tuesday", shift: "all_day" },
      { id: "av_12", employeeName: "Sam", dayOfWeek: "Thursday", shift: "all_day" },
      { id: "av_13", employeeName: "Sam", dayOfWeek: "Saturday", shift: "morning" },
    ],
    timeSlots: [],
    inventory: [
      { id: "inv_1", name: "Dollies", quantity: 5, unit: "pcs" },
      { id: "inv_2", name: "Blankets", quantity: 32, unit: "pcs" },
      { id: "inv_3", name: "Straps", quantity: 18, unit: "pcs" },
    ],
    activeUserId: "u_customer_1",
  };
};
