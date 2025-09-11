const bcrypt = require("bcryptjs");
const readline = require("readline");

// Create an interface for reading input from the command line
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Prompts the user for a single input and returns it as a Promise.
 * @param {string} query The prompt message to display to the user.
 * @returns {Promise<string>} The user's input.
 */
const askQuestion = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

/**
 * Capitalizes the first letter of each word in a string and trims whitespace.
 * @param {string} str The string to format.
 * @returns {string} The formatted string.
 */
const capitalizeAndTrim = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
};

/**
 * Validates a password based on specific requirements.
 * @param {string} password The password to validate.
 * @returns {boolean} True if the password is valid, false otherwise.
 */
const validatePassword = (password) => {
  // Password must be at least 8 characters long
  if (password.length < 8) {
    console.log("Password must be at least 8 characters long.");
    return false;
  }
  // Check for at least one lowercase, uppercase, number, and symbol
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password);

  if (!hasLowercase) {
    console.log("Password must contain at least one lowercase letter.");
    return false;
  }
  if (!hasUppercase) {
    console.log("Password must contain at least one uppercase letter.");
    return false;
  }
  if (!hasNumber) {
    console.log("Password must contain at least one number.");
    return false;
  }
  if (!hasSymbol) {
    console.log("Password must contain at least one symbol.");
    return false;
  }

  return true;
};

/**
 * Main function to guide the user and generate the MongoDB command.
 */
const main = async () => {
  console.log("Let's create a new MongoDB user object.");
  console.log("---------------------------------------");

  let firstName = "";
  while (firstName.length < 2) {
    firstName = capitalizeAndTrim(
      await askQuestion("Enter the user's first name: "),
    );
    if (firstName.length < 2) {
      console.log("First name is too short. Please try again.");
    }
  }

  let lastName = "";
  while (lastName.length < 2) {
    lastName = capitalizeAndTrim(
      await askQuestion("Enter the user's last name: "),
    );
    if (lastName.length < 2) {
      console.log("Last name is too short. Please try again.");
    }
  }

  let email = "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  while (!emailRegex.test(email)) {
    email = (await askQuestion("Enter the user's email: "))
      .trim()
      .toLowerCase();
    if (!emailRegex.test(email)) {
      console.log("Invalid email format. Please try again.");
    }
  }

  let dob = "";
  while (!Date.parse(dob)) {
    dob = await askQuestion("Enter the user's date of birth (YYYY-MM-DD): ");
    if (!Date.parse(dob)) {
      console.log("Invalid date format. Please use YYYY-MM-DD.");
    }
  }

  let password = "";
  while (!validatePassword(password)) {
    password = await askQuestion(
      "Enter a secure password (min 8 chars, incl. lowercase, uppercase, number, symbol): ",
    );
  }

  console.log("Hashing password...");
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log("Password successfully hashed!");

  const mongoCommand = `db.sellers.insertOne({
  firstName: "${firstName}",
  lastName: "${lastName}",
  email: "${email}",
  dateOfBirth: new Date("${dob}"),
  password: "${hashedPassword}",
  role: "superadmin",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date()
});`;

  console.log("\n---------------------------------------");
  // Print the message as requested, but also note the manual step
  console.log("Press Enter to copy to clipboard");
  console.log(mongoCommand);
  console.log("---------------------------------------");

  // Close the interface after the user presses Enter
  await askQuestion("");
  rl.close();
};

main().catch((err) => {
  console.error("An error occurred:", err);
  rl.close();
});
