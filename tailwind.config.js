/** XA Project PhotoLog — same locked brand tokens as xadOS-app, so this
 *  standalone app still feels like part of the XA DOS family even though
 *  it's a separate deployment.
 */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#06080D",
        panel: "#10131C",
        "panel-raised": "#171D34",
        hair: "#1C212E",
        "hair-soft": "#1A2036",
        text: {
          primary: "#F2F4F8",
          secondary: "#8A92A6",
          tertiary: "#565D70",
        },
        brand: {
          blue: "#3D7FFF",
          "blue-deep": "#173B7A",
          "blue-light": "#BFDBFF",
        },
        status: {
          green: "#37D399",
          amber: "#F0A93B",
          red: "#F16A6A",
        },
      },
      fontFamily: {
        display: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "14px",
        control: "10px",
      },
      boxShadow: {
        panel: "0 20px 40px -14px rgba(0,0,0,0.5)",
        "glow-blue": "0 8px 20px -6px rgba(61,127,255,0.45)",
      },
    },
  },
  plugins: [],
};
