// function to parse HTML description from URA masterplan .geojson
export const parseDescription = (description: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(description, "text/html");
  const rows = doc.querySelectorAll("tr");
  const properties: Record<string, string> = {};

  rows.forEach((row) => {
    const cells = row.querySelectorAll("th, td");
    if (cells.length === 2) {
      const key = cells[0].textContent?.trim();
      const value = cells[1].textContent?.trim();
      if (key && value) {
        properties[key] = value;
      }
    }
  });

  return properties;
};
