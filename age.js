function calculateAge(dateOfBirth, today = new Date()) {
  if (!dateOfBirth) return null;

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birthDate.getTime()) || birthDate > today) return null;

  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (birthdayThisYear > today) age -= 1;

  return age >= 0 ? age : null;
}

module.exports = { calculateAge };
