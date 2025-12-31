# Cost2Class (Premium Edition)

A high-end, mobile-first academic budget planner designed to look and feel like a native app. Manage school fees, uniforms, stationery, and admin tasks with a sleek, polished interface.

## 📱 Features

-   **Mobile-First Design**: Bottom-sheet navigation, reachability-focused layout, and touch-optimized interactive elements.
-   **Premium Aesthetics**: Glassmorphism headers, pastel widget dashboards, and fluid 60fps animations.
-   **Smart Data Management**:
    -   **CSV Import/Export**: Backup your data or edit bulk items in Excel.
    -   **Local Storage**: Auto-saves your progress instantly.
-   **Visual Analytics**: Interactive donut charts and progress metrics.

## 💾 Does my data persist on GitHub?

**Yes and No. Here is how it works:**

1.  **On your device**: Yes! The app uses your browser's **Local Storage**. If you open the GitHub Pages link on your phone, add items, and close the tab, **your data will be there when you come back**.
2.  **Across devices**: No. Data does NOT sync between your phone and laptop automatically (because there is no backend server).
3.  **On GitHub itself**: No. Your private financial data is **never** sent to GitHub. It lives 100% on your phone/computer.

**💡 Pro Tip**: Use the **Export CSV** button to "save" your data if you want to move it to another device or keep a backup file!

## 🚀 How to Host on GitHub Pages

1.  Push this code to a GitHub repository.
2.  Go to **Settings** > **Pages**.
3.  Under **Source**, select `main` branch and the `/root` folder (or `/docs` if you move files there).
4.  Click **Save**.
5.  GitHub will give you a link (e.g., `username.github.io/cost2class`). Open that link on your phone!

## 🛠️ Local Development

To run this locally:

1.  Clone the repo.
2.  Open the folder in VS Code.
3.  Use the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension or run:
    ```bash
    npx http-server ./new
    ```
