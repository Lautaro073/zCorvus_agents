import { useCallback, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import type { MouseEvent } from "react";

import { getIconsSVG } from "@/features/icons-explorer";
import type { IconTypeInfo, IconSet } from "@/types/icons/icons.types";

export type IconExportState = "react" | "svg" | "html";

type BlobInfo = { mime: string; ext: string };

interface UseIconExportArgs {
  icon: IconTypeInfo;
  state: IconExportState;
}

const useIconExport = ({ icon, state }: UseIconExportArgs) => {
  const isFontAwesome = icon.type === 'fa-solid' || icon.type === 'fa-regular';
  
  const [svgMarkup, setSvgMarkup] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    getIconsSVG(icon.type as IconSet).then((iconsMap: any) => {
      if (!mounted || !iconsMap) return;
      if (isFontAwesome) {
        const iconDef = iconsMap[icon.name];
        if (!iconDef) return;
        const [width, height, , , path] = iconDef.icon;
        setSvgMarkup(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path d="${Array.isArray(path) ? path.join(' ') : path}"/></svg>`);
      } else {
        const variantMap = iconsMap[icon.variant || ""] || iconsMap;
        setSvgMarkup(variantMap?.[icon.name] ?? "");
      }
    });
    return () => { mounted = false; };
  }, [icon, isFontAwesome]);

  const reactSnippet = useMemo(() => {
    if (isFontAwesome) {
      return `import { FontAwesomeIcon } from '@fontawesome/react-fontawesome';\nimport { ${icon.name} } from '@fontawesome/free-${icon.type === 'fa-solid' ? 'solid' : 'regular'}-svg-icons';\n\n<FontAwesomeIcon icon={${icon.name}} />`;
    }
    return `<ZIcon type="${icon.type}" name="${icon.name}" variant="${icon.variant}" />`;
  }, [icon, isFontAwesome]);

  const htmlSnippet = useMemo(() => {
    if (isFontAwesome) {
      return `<!-- Font Awesome via CDN -->\n<i class="fa${icon.type === 'fa-solid' ? 's' : 'r'} fa-${icon.name}"></i>`;
    }
    return `<z-icon name="${icon.name}" type="${icon.type}" variant="${icon.variant}" />`;
  }, [icon, isFontAwesome]);

  const infoByState = useMemo<Record<IconExportState, string>>(
    () => ({
      react: reactSnippet,
      svg: svgMarkup,
      html: htmlSnippet,
    }),
    [reactSnippet, svgMarkup, htmlSnippet]
  );

  const infoDownloadByState = useMemo<Record<IconExportState, string>>(
    () => ({
      react: reactSnippet,
      svg: svgMarkup,
      html: isFontAwesome 
        ? `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Font Awesome Demo</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
</head>
<body>
  <i class="fa${icon.type === 'fa-solid' ? 's' : 'r'} fa-${icon.name}"></i>
</body>
</html>`
        : `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Z-Icons Demo</title>
</head>
<body>
  <script type="module" src="https://cdn.jsdelivr.net/npm/@zcorvus/z-icons"></script>
  <z-icon name="${icon.name}" type="${icon.type}" variant="${icon.variant}" />
</body>
</html>
`,
    }),
    [reactSnippet, svgMarkup, icon, isFontAwesome]
  );

  const infoBlob = useMemo<Record<IconExportState, BlobInfo>>(
    () => ({
      react: { mime: "text/plain;charset=utf-8", ext: "tsx" },
      svg: { mime: "image/svg+xml;charset=utf-8", ext: "svg" },
      html: { mime: "text/html;charset=utf-8", ext: "html" },
    }),
    []
  );

  const codeSnippet = infoByState[state];

  const handleCopyIcon = useCallback(() => {
    void navigator.clipboard.writeText(icon.name).then(
      () =>
        toast.success("Icon name copied!", {
          description: icon.name,
        }),
      () => toast.error("Could not copy icon name.")
    );
  }, [icon.name]);

  const handleCopyCode = useCallback(
    (e?: MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();

      const snippet = infoByState[state];
      void navigator.clipboard.writeText(snippet).then(
        () =>
          toast.success("Code snippet copied!", {
            description: snippet,
          }),
        () => toast.error("Could not copy code snippet.")
      );
    },
    [infoByState, state]
  );

  const handleDownloadIcon = useCallback(
    (e?: MouseEvent<HTMLButtonElement>) => {
      e?.stopPropagation();

      const { mime, ext } = infoBlob[state];
      const payload = infoDownloadByState[state];

      const blob = new Blob([payload], { type: mime });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${icon.name}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [icon.name, infoBlob, infoDownloadByState, state]
  );

  return {
    codeSnippet,
    infoByState,
    handleCopyIcon,
    handleCopyCode,
    handleDownloadIcon,
  };
}

export { useIconExport }