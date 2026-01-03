/* RCONfig is a tool for the .rconfig file format */
/* An example .rconfig file:
[ip; 127.0.0.1]
[port; 25575]
[password; password123]
*/
/* This should parse into an object like this:
{
    ip: "127.0.0.1",
    port: 25575,
    password: "password123"
}
*/

export default class RCONfig {
  constructor() {
    this.config = {};
  }

  async parseConfig(config) {
    const lines = config.split("\n");

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // IMPORTANT: normalize whitespace first
      line = line.trim();

      // Skip empty lines
      if (!line) continue;

      // Skip comments (even if file had indentation originally)
      if (line.startsWith("#")) continue;

      const split = line.split(";");
      if (split.length < 2) continue; // or throw a clearer error

      const key = split[0].replace("[", "").replace("]", "").trim();

      // value part ends with "]" - remove the trailing "]"
      const rawValue = split[1].trim();
      const value = rawValue.endsWith("]")
        ? rawValue.slice(0, -1).trim()
        : rawValue;

      this.config[key] = value;
    }

    return this.config;
  }
}
