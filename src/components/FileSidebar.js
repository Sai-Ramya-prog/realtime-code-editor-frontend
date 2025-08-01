//import React, { useState } from 'react';
import { FaFolder, FaFolderOpen, FaFileCode, FaPlus, FaEllipsisV } from 'react-icons/fa';
import React, { useState, useEffect } from 'react';

const FileSidebar = ({ tree, activeFile, setActiveFile, onAddFile, onAddFolder, onAddFileToFolder, roomId,setFiles,setFileTree,socketRef,username }) => {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [contextMenu, setContextMenu] = useState(null);
const [menuType, setMenuType] = useState(null);

  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };
 const showRootContextMenu = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    });
    setMenuType('root');
  };
  const handleContextMenu = (e, filePath, type) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setContextMenu({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      filePath,
    });
    setMenuType(type);
  };

 const closeContextMenu = () => {
    setContextMenu(null);
    setMenuType(null);
  };
  const handleCreateFileInFolder = (folderPath) => {
    const newFileName = prompt('Enter new file name (e.g., about.html)');
   
    if (!newFileName) return;
    const fullPath = folderPath + newFileName;
    onAddFileToFolder && onAddFileToFolder(fullPath);
    closeContextMenu();
  };

const handleRename = async (oldPath) => {
  const isFolder = oldPath.endsWith('/');
  const defaultName = isFolder 
    ? oldPath.split('/').slice(-2, -1)[0] 
    : oldPath.split('/').pop();
  
  const newName = prompt('Enter new name', defaultName);
  
  if (!newName || newName === defaultName) return;

  try {
    // Calculate new path
    let newPath;
    if (isFolder) {
      const parts = oldPath.split('/');
      parts.splice(-2, 1, newName);
      newPath = parts.join('/');
    } else {
      const parts = oldPath.split('/');
      parts[parts.length - 1] = newName;
      newPath = parts.join('/');
    }

    const res = await fetch('https://realtime-code-editor-backend-l2ok.onrender.com/api/code/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, oldPath, newPath })
    });

    if (res.ok) {
      // Update files state
      setFiles(prev => {
        const newFiles = { ...prev };
        if (newFiles[oldPath]) {
          newFiles[newPath] = newFiles[oldPath];
          delete newFiles[oldPath];
        }
        return newFiles;
      });

      // Update file tree state
      setFileTree(prevTree => {
        if (!prevTree) return prevTree;
        
        const newTree = JSON.parse(JSON.stringify(prevTree));
        const updateNode = (nodes) => {
          for (let node of nodes) {
            if (node.path === oldPath) {
              node.name = newName;
              node.path = newPath;
              return true;
            }
            if (node.children && updateNode(node.children)) {
              return true;
            }
          }
          return false;
        };
        
        updateNode(newTree.children);
        return newTree;
      });

      // Update active file if needed
      if (activeFile === oldPath) {
        setActiveFile(newPath);
      }
           if (socketRef.current?.connected) {
          const eventName = isFolder ? 'folder-renamed' : 'file-renamed';
          socketRef.current.emit(eventName, {
            roomId,
            oldPath,
            newPath,
            username
          });
        }

        if (!isFolder && activeFile === oldPath) {
          setActiveFile(newPath);
        }
    } else {
      throw new Error('Rename failed');
    }
  } catch (error) {
    console.error('Rename error:', error);
    alert('Rename failed. Check console for details.');
  }
};

 const handleDelete = async (path) => {
  if (!window.confirm(`Are you sure you want to delete ${path}?`)) return;
  const isFolder=path.endsWith('/');
  try {
    const res = await fetch(`https://realtime-code-editor-backend-l2ok.onrender.com/api/code/delete/${roomId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });

    if (res.ok) {
      // Update files state
      setFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[path];
        return newFiles;
      });

      // Update file tree state
      setFileTree(prevTree => {
        if (!prevTree) return prevTree;
        
        const newTree = JSON.parse(JSON.stringify(prevTree));
        const removeNode = (nodes) => {
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].path === path) {
              nodes.splice(i, 1);
              return true;
            }
            if (nodes[i].children && removeNode(nodes[i].children)) {
              return true;
            }
          }
          return false;
        };
        
        removeNode(newTree.children);
        return newTree;
      });
      if (socketRef.current?.connected) {
          const eventName = isFolder ? 'folder-deleted' : 'file-deleted';
          socketRef.current.emit(eventName, {
            roomId,
            path,
            username
          });
        }
    } else {
      throw new Error('Delete failed');
    }
  } catch (error) {
    console.error('Delete error:', error);
    alert('Delete failed. Check console for details.');
  }
};

  const renderTree = (node) => {
    if (node.type === 'file') {
      return (
        <div
          key={node.path}
          className={`file-item ${node.path === activeFile ? 'active' : ''}`}
          onClick={() => setActiveFile(node.path)}
        >
          <FaFileCode />
          <span>{node.name}</span>
          <FaEllipsisV onClick={(e) => {
            e.stopPropagation();
            handleContextMenu(e, node.path, 'file')}} />
        </div>
      );
    }

    if (node.type === 'folder') {
      return (
        <div key={node.path} className="folder-container">
          <div className="folder-item" onClick={() => toggleFolder(node.path)}>
            {expandedFolders[node.path] ? <FaFolderOpen /> : <FaFolder />}
            <span>{node.name}</span>
            <FaEllipsisV onClick={(e) => 
            {e.stopPropagation();
              handleContextMenu(e, node.path, 'folder');}} />
          </div>

          {expandedFolders[node.path] && (
            <div className="folder-contents">
              {node.children.map(child => renderTree(child))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };
// Close context menu when clicking outside
useEffect(() => {
  const handleClickOutside = () => {
    setContextMenu(null);
  };
  document.addEventListener('click', handleClickOutside);
  return () => {
    document.removeEventListener('click', handleClickOutside);
  };
}, []);

 return (
    <div className="file-sidebar">
      <div className="file-sidebar-header">
        <h3>Files</h3>
        <div className="file-actions">
  <button 
    onClick={(e) => {
      e.stopPropagation();
      showRootContextMenu(e);
    }} 
    title="Add File"
  >
    <FaPlus /> File
  </button>
  <button 
    onClick={(e) => {
      e.stopPropagation();
      showRootContextMenu(e);
    }} 
    title="Add Folder"
  >
    <FaPlus /> Folder
  </button>
</div>
      </div>

      <div className="file-tree">
        {tree?.children?.map(child => renderTree(child))}
      </div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed', // Changed from 'absolute' to 'fixed'
      top: `${contextMenu.top}px`,
      left: `${contextMenu.left}px`,
      zIndex: 1000,
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      minWidth: '150px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {menuType === 'folder' && (
            <>
              <div className="context-menu-item" onClick={() => {
                handleCreateFileInFolder(contextMenu.filePath);
                closeContextMenu();
              }}>New File</div>
              <div className="context-menu-item" onClick={() => {
                // Handle new folder in folder
                closeContextMenu();
              }}>New Folder</div>
            </>
          )}
          
          {menuType === 'root' && (
            <>
              <div className="context-menu-item" onClick={() => {
                onAddFile();
                closeContextMenu();
              }}>New File</div>
              { <div className="context-menu-item" onClick={() => {
                onAddFolder();
                closeContextMenu();
              }}>New Folder</div> 
              }
            </>
          )}
          
          {menuType !== 'root' && (
            <>
              <div className="context-menu-item" onClick={() => {
                handleRename(contextMenu.filePath);
                closeContextMenu();
              }}>Rename</div>
              <div className="context-menu-item" onClick={() => {
                handleDelete(contextMenu.filePath);
                closeContextMenu();
              }}>Delete</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileSidebar;
