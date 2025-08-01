import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export function downloadProjectAsZip(fileTree, files, zipName = 'project.zip') {
  const zip = new JSZip();

  const addToZip = (zipFolder, nodes) => {
    nodes.forEach(node => {
      if (node.type === 'file') {
        const content = files[node.path] || '';
        zipFolder.file(node.name, content);
      } else if (node.type === 'folder') {
        const folder = zipFolder.folder(node.name);
        if (folder) addToZip(folder, node.children || []);
      }
    });
  };

  if (fileTree && fileTree.children) {
    addToZip(zip, fileTree.children);
  }

  zip.generateAsync({ type: 'blob' }).then(content => {
    saveAs(content, zipName);
  });
}
