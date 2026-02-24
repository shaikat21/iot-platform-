import { manufactureBatch } from "../models/manufacturing.model.js";

(async () => {
  try {
    const serials = await manufactureBatch({
      factory: "A",
      line: "1",
      lot: 2,
      count: 10
    });

    console.log("Manufactured:", serials.length);
    console.log(serials);

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
