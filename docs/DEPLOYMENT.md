# COSMOSIM Web Deployment

COSMOSIM is published as a browser-only static website with GitHub Pages. The original Flask/Python application remains in the repository and is not replaced by this deployment.

## Website

After GitHub Pages is enabled for this repository, the site URL is:

https://anuveytq-sys.github.io/COSMOSIM-/

## Automatic build and deployment

The workflow at `.github/workflows/pages.yml` runs on every push to `main` and can also be started manually from the GitHub Actions tab.

The workflow:
1. Copies `static/index.html` and `static/interstellar-flight.js` into a clean website build directory.
2. Adapts the command form to use the browser's local command parser, because GitHub Pages cannot run the Flask `/api/command` endpoint.
3. Loads the Interstellar Flight module using a relative path so it works under the repository's GitHub Pages URL.
4. Publishes the built files using GitHub Pages.

## Enable Pages once

In GitHub, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. After that, pushes to `main` trigger the workflow automatically.

## Feature notes

- The visual simulations and browser-side controls run as static files.
- The hosted Pages version does not run Python or call the Gemini API; the space-command form uses the built-in local browser parser.
- Gemini-powered command interpretation remains available when running the Flask application locally with `GEMINI_API_KEY` configured privately.
- Never commit an API key to the repository.
