import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useParams, useNavigate, useBeforeUnload } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import FileSidebar from '../components/FileSidebar';
import '../styles/editor.css';
import { downloadProjectAsZip } from '../utils/downloadZip';

function EditorPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const initializedRef = useRef(false);
  const currentUserRef = useRef(null);
  const editorRef = useRef(null);
  const iframeRef = useRef(null);
  const isUpdatingFromSocket = useRef(false);
  const lastChangeTimestamp = useRef(0);

  const [username, setUsername] = useState('');
  const [files, setFiles] = useState(null);
  const [activeFile, setActiveFile] = useState('index.html');
  const [connectionStatus, setConnectionStatus] = useState('Connecting...');
  const [users, setUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [userCursors, setUserCursors] = useState({});
const [showNewFileModal, setShowNewFileModal] = useState(false);
const [showNewFolderModal, setShowNewFolderModal] = useState(false);
const [newFileName, setNewFileName] = useState('');
const [newFolderName, setNewFolderName] = useState('');
// Add to your existing state
const [fileTree, setFileTree] = useState(null);
 
  const [panelWidth, setPanelWidth] = useState(65); 
const [isDragging, setIsDragging] = useState(false);

 // Colors for different users
  const userColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const getUserColor = (userId) => {
    const index = Object.keys(activeUsers).indexOf(userId);
    return userColors[index % userColors.length];
  };

  // Debounced save function
  // const debouncedSave = useCallback(
  //   debounce(async (roomId, filename, content) => {
  //     try {
  //       await fetch('http://localhost:5000/api/code/save', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ roomId, filename, content }),
  //       });
  //     } catch (err) {
  //       console.error('Error saving file:', err);
  //     }
  //   }, 2000),
  //   [roomId]);

const debouncedSave = debounce(async (roomId, filename, content) => {
  try {
    await fetch('https://realtime-code-editor-backend-l2ok.onrender.com/api/code/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, filename, content }),
    });
  } catch (err) {
    console.error('Error saving file:', err);
  }
}, 2000);

//const debouncedSave = useCallback(debouncedFunction, []);

  const fetchFiles = useCallback(async () => {
  if (!roomId) return;

  try {
    const response = await fetch(`https://realtime-code-editor-backend-l2ok.onrender.com/api/code/${roomId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        // Create default files structure
        const defaultFiles = {
          'index.html': '<!DOCTYPE html>\n<html>\n<head>\n    <title>My App</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>',
          'style.css': '/* Add your CSS styles here */\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}',
          'script.js': '// Add your JavaScript code here\nconsole.log("Hello from JavaScript!");'
        };

        // Save default files to database
        await Promise.all(
          Object.entries(defaultFiles).map(([filename, content]) =>
            debouncedSave(roomId, filename, content)
        ));

        // Create default tree structure
        const defaultTree = {
          name: 'root',
          type: 'folder',
          path: '',
          children: [
            {
              name: 'index.html',
              type: 'file',
              path: 'index.html',
              content: defaultFiles['index.html']
            },
            {
              name: 'style.css',
              type: 'file',
              path: 'style.css',
              content: defaultFiles['style.css']
            },
            {
              name: 'script.js',
              type: 'file',
              path: 'script.js',
              content: defaultFiles['script.js']
            }
          ]
        };

        return {
          files: defaultFiles,
          tree: defaultTree
        };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const { files, tree } = await response.json();
    
    // Ensure required files exist
    const requiredFiles = ['index.html', 'style.css', 'script.js'];
    const completeFiles = { ...files };
    
    requiredFiles.forEach(file => {
      if (!completeFiles[file]) {
        completeFiles[file] = file.endsWith('.html') ? 
          '<!DOCTYPE html>\n<html>\n<head>\n    <title>My App</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>' :
          file.endsWith('.css') ? 
          '/* Add your CSS styles here */\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}' :
          '// Add your JavaScript code here\nconsole.log("Hello from JavaScript!");';
        
        // Add missing file to tree if it doesn't exist
        if (!tree.children.some(child => child.name === file)) {
          tree.children.push({
            name: file,
            type: 'file',
            path: file,
            content: completeFiles[file]
          });
        }
      }
    });

    return {
      files: completeFiles,
      tree: tree
    };
  } catch (error) {
    console.error('Error loading files:', error);
    
    // Fallback to default structure
    const defaultFiles = {
      'index.html': '<!DOCTYPE html>\n<html>\n<head>\n    <title>My App</title>\n</head>\n<body>\n    <h1>Hello World!</h1>\n</body>\n</html>',
      'style.css': '/* Add your CSS styles here */\nbody {\n    font-family: Arial, sans-serif;\n    margin: 0;\n    padding: 20px;\n}',
      'script.js': '// Add your JavaScript code here\nconsole.log("Hello from JavaScript!");'
    };

    const defaultTree = {
      name: 'root',
      type: 'folder',
      path: '',
      children: [
        {
          name: 'index.html',
          type: 'file',
          path: 'index.html',
          content: defaultFiles['index.html']
        },
        {
          name: 'style.css',
          type: 'file',
          path: 'style.css',
          content: defaultFiles['style.css']
        },
        {
          name: 'script.js',
          type: 'file',
          path: 'script.js',
          content: defaultFiles['script.js']
        }
      ]
    };

    return {
      files: defaultFiles,
      tree: defaultTree
    };
  }
}, [roomId, debouncedSave]);

  // Initialize socket connection
  const initializeSocket = useCallback((filesData) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io('https://realtime-code-editor-backend-l2ok.onrender.com', {
      transports: ['websocket'],
      upgrade: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
socket.on('room-error', (msg) => {
  alert(msg);           // Show the error message
  navigate('/room');    // Redirect user back to RoomPage
});

    socket.on('connect', () => {
      console.log('🟢 Connected to server');
      setConnectionStatus('Connected');
      currentUserRef.current = socket.id;
      socket.emit('join-room', { 
        roomId, 
        username,
        files: filesData 
      });
    });

    socket.on('disconnect', () => {
      console.log('🔴 Disconnected from server');
      setConnectionStatus('Disconnected');
    });

    socket.on('reconnect', () => {
      console.log('🟡 Reconnected to server');
      setConnectionStatus('Connected');
      socket.emit('join-room', { 
        roomId, 
        username,
        files: files 
      });
    });

    socket.on('room-state', ({ files: roomFiles, users: roomUsers }) => {
      console.log('📋 Received room state:', { files: Object.keys(roomFiles), users: roomUsers.length });
      setFiles(roomFiles);
      setUsers(roomUsers);
    });

socket.on('code-update', ({ filePath, code, sender, position, username: senderUsername }) => {
  if (sender !== currentUserRef.current) {
    console.log('📝 Code update from', senderUsername, 'for', filePath);
    
    isUpdatingFromSocket.current = true;
    // Update both files state and file tree state in a single batch
     
    setFiles(prevFiles => {
      const newFiles = { ...prevFiles, [filePath]: code };
     
      // Update editor content if it's the active file
      if (filePath === activeFile && editorRef.current) {
        const model = editorRef.current.models?.[filePath];
        if (model && model.getValue() !== code) {
          // Save current cursor position
          const currentSelection = editorRef.current.getSelection();
          const scrollInfo = editorRef.current.getScrollTop();
          
          // Update content
          model.setValue(code);
          
          // Restore cursor position if it was the current user's cursor
          if (currentSelection && !position) {
            editorRef.current.setSelection(currentSelection);
            editorRef.current.setScrollTop(scrollInfo);
          }
        }
      }
      
      return newFiles;
    });
  

    // Update the file tree structure
    setFileTree(prevTree => {
      if (!prevTree) return prevTree;
      
      // Create a deep clone of the tree
      const newTree = JSON.parse(JSON.stringify(prevTree));
      
      // Function to find and update the file in the tree
      const updateFileContent = (nodes) => {
        for (let node of nodes) {
          if (node.path === filePath && node.type === 'file') {
            node.content = code;
            return true;
          }
          if (node.children && updateFileContent(node.children)) {
            return true;
          }
        }
        return false;
      };
      
      updateFileContent(newTree.children);
      return newTree;
    });

    // Update user cursor position
    if (position) {
      setUserCursors(prev => ({
        ...prev,
        [sender]: { 
          ...prev[sender], 
          position, 
          activeFile: filePath,
          username: senderUsername
        }
      }));
    }

    // Show typing indicator
    if (filePath === activeFile) {
      setTypingUsers(prev => ({
        ...prev,
        [sender]: { username: senderUsername, timestamp: Date.now() }
      }));
    }

    setTimeout(() => {
      isUpdatingFromSocket.current = false;
    }, 100);
  }
});

socket.on('file-deleted', ({ path }) => {
  setFiles(prev => {
    const newFiles = { ...prev };
    delete newFiles[path];
    return newFiles;
  });

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
});

 socket.on('file-renamed', ({ oldPath, newPath }) => {
  setFiles(prev => {
    const newFiles = { ...prev };
    if (newFiles[oldPath]) {
      newFiles[newPath] = newFiles[oldPath];
      delete newFiles[oldPath];
    }
    return newFiles;
  });

  setFileTree(prevTree => {
    if (!prevTree) return prevTree;
    
    const newTree = JSON.parse(JSON.stringify(prevTree));
    const updateNode = (nodes) => {
      for (let node of nodes) {
        if (node.path === oldPath) {
          const newName = newPath.split('/').pop();
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

  if (activeFile === oldPath) {
    setActiveFile(newPath);
  }
});
socket.on('folder-renamed', ({ oldPath, newPath }) => {
  // Update files
  setFiles(prev => {
    const updated = {};
    for (const key in prev) {
      if (key.startsWith(oldPath)) {
        const newKey = key.replace(oldPath, newPath);
        updated[newKey] = prev[key];
      } else {
        updated[key] = prev[key];
      }
    }
    return updated;
  });

  // Update file tree
  setFileTree(prevTree => {
    if (!prevTree) return prevTree;
    const newTree = JSON.parse(JSON.stringify(prevTree));

    const updatePaths = (nodes) => {
      nodes.forEach((node) => {
        if (node.path.startsWith(oldPath)) {
          node.path = node.path.replace(oldPath, newPath);
          if (node.type === 'folder') {
            node.name = newPath.replace(/\/$/, '').split('/').pop();
          }
        }
        if (node.children) updatePaths(node.children);
      });
    };

    updatePaths(newTree.children);
    return newTree;
  });
});
socket.on('folder-deleted', ({ path }) => {
  setFiles(prev => {
    const updated = {};
    for (const key in prev) {
      if (!key.startsWith(path)) {
        updated[key] = prev[key];
      }
    }
    return updated;
  });

  setFileTree(prevTree => {
    if (!prevTree) return prevTree;
    const newTree = JSON.parse(JSON.stringify(prevTree));

    const removeFolder = (nodes) => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].path === path) {
          nodes.splice(i, 1);
          return true;
        }
        if (nodes[i].children && removeFolder(nodes[i].children)) {
          return true;
        }
      }
      return false;
    };

    removeFolder(newTree.children);
    return newTree;
  });
});

    socket.on('user-joined', ({ userId, username: newUsername }) => {
      console.log('👤 User joined:', newUsername);
      setUsers(prev => {
        const exists = prev.find(u => u.id === userId);
        if (!exists) {
          return [...prev, { id: userId, username: newUsername }];
        }
        return prev;
      });
    });

    socket.on('user-left', ({ userId, username: leftUsername }) => {
      console.log('👤 User left:', leftUsername);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setActiveUsers(prev => {
        const newActive = { ...prev };
        delete newActive[userId];
        return newActive;
      });
      setUserCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[userId];
        return newCursors;
      });
      setTypingUsers(prev => {
        const newTyping = { ...prev };
        delete newTyping[userId];
        return newTyping;
      });
    });

    socket.on('cursor-position', ({ userId, username: cursorUsername, position, activeFile: userActiveFile }) => {
      if (userId !== currentUserRef.current && userActiveFile === activeFile) {
        setUserCursors(prev => ({
          ...prev,
          [userId]: { 
            position, 
            activeFile: userActiveFile, 
            username: cursorUsername,
            timestamp: Date.now()
          }
        }));
      }
    });

    socket.on('user-typing', ({ userId, username: typingUsername, filePath }) => {
      if (userId !== currentUserRef.current && filePath === activeFile) {
        setTypingUsers(prev => ({
          ...prev,
          [userId]: { username: typingUsername, timestamp: Date.now() }
        }));
      }
    });
// Listen for remote file creation
socket.on('remote-file-created', ({ filePath, content }) => {
  setFiles(prev => ({ ...prev, [filePath]: content }));

  setFileTree(prevTree => {
    if (!prevTree) return prevTree;

    const newTree = JSON.parse(JSON.stringify(prevTree)); // Deep copy
    const parts = filePath.split('/');
    const fileName = parts.pop(); // last item is the file name
    const folderPathParts = parts;

    let current = newTree;

    for (const part of folderPathParts) {
      let folder = current.children.find(
        child => child.name === part && child.type === 'folder'
      );
      if (!folder) {
        folder = {
          name: part,
          type: 'folder',
          path: (current.path || '') + part + '/',
          children: []
        };
        current.children.push(folder);
      }
      current = folder;
    }

    // Add the new file under the right folder
    current.children.push({
      name: fileName,
      type: 'file',
      path: filePath,
      content
    });

    return newTree;
  });
});

// Listen for remote folder creation
socket.on('remote-folder-created', ({ path }) => {
  setFileTree(prevTree => {
    if (!prevTree) return prevTree;
    const exists = prevTree.children.some(child => child.path === path);
    if (!exists) {
      return {
        ...prevTree,
        children: [
          ...prevTree.children,
          {
            name: path.replace(/\/$/, '').split('/').pop(),
            type: 'folder',
            path,
            children: []
          }
        ]
      };
    }
    return prevTree;
  });
});

    socketRef.current = socket;
    return socket;
  }, [username, roomId, activeFile, files,navigate]);

  // Clear old typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(userId => {
          if (now - updated[userId].timestamp > 3000) {
            delete updated[userId];
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

useEffect(() => {
  if (!socketRef.current) return;

  const socket = socketRef.current;

  socket.on('file-deleted', ({ path }) => {
    setFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[path];
      return newFiles;
    });

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
  });

  socket.on('file-renamed', ({ oldPath, newPath }) => {
    setFiles(prev => {
      const newFiles = { ...prev };
      if (newFiles[oldPath]) {
        newFiles[newPath] = newFiles[oldPath];
        delete newFiles[oldPath];
      }
      return newFiles;
    });

    setFileTree(prevTree => {
      if (!prevTree) return prevTree;
      const newTree = JSON.parse(JSON.stringify(prevTree));
      const updateNode = (nodes) => {
        for (let node of nodes) {
          if (node.path === oldPath) {
            const newName = newPath.split('/').pop();
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

    if (activeFile === oldPath) {
      setActiveFile(newPath);
    }
  });

  return () => {
    socket.off('file-deleted');
    socket.off('file-renamed');
  };
}, [activeFile]);
useEffect(() => {
  if (!socketRef.current) return;
  const socket = socketRef.current;

  // 🔁 Folder Renamed
  socket.on('folder-renamed', ({ oldPath, newPath }) => {
    setFiles(prev => {
      const updated = {};
      for (const key in prev) {
        if (key.startsWith(oldPath)) {
          const updatedKey = key.replace(oldPath, newPath);
          updated[updatedKey] = prev[key];
        } else {
          updated[key] = prev[key];
        }
      }
      return updated;
    });

    setFileTree(prev => {
      if (!prev) return prev;
      const tree = JSON.parse(JSON.stringify(prev));
      const updatePaths = (nodes) => {
        nodes.forEach(node => {
          if (node.path.startsWith(oldPath)) {
            node.path = node.path.replace(oldPath, newPath);
            if (node.type === 'folder') {
              node.name = newPath.replace(/\/$/, '').split('/').pop();
            }
          }
          if (node.children) updatePaths(node.children);
        });
      };
      updatePaths(tree.children);
      return tree;
    });
  });

  // 🗑️ Folder Deleted
  socket.on('folder-deleted', ({ path }) => {
    setFiles(prev => {
      const updated = {};
      for (const key in prev) {
        if (!key.startsWith(path)) {
          updated[key] = prev[key];
        }
      }
      return updated;
    });

    setFileTree(prev => {
      if (!prev) return prev;
      const tree = JSON.parse(JSON.stringify(prev));
      const removeFolder = (nodes) => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].path === path) {
            nodes.splice(i, 1);
            return true;
          }
          if (nodes[i].children && removeFolder(nodes[i].children)) {
            return true;
          }
        }
        return false;
      };
      removeFolder(tree.children);
      return tree;
    });
  });

  return () => {
    socket.off('folder-renamed');
    socket.off('folder-deleted');
  };
}, []);

  // Main initialization effect
  useEffect(() => {
    if (!roomId) {
      navigate('/room');
      return;
    }

    if (initializedRef.current) return;
    initializedRef.current = true;

    const user = (location.state && location.state.username) ||
                 localStorage.getItem('username') ||
                 'Guest';
    setUsername(user);

  const initialize = async () => {
  try {
    // 1. Fetch files - now returns { files, tree }
    const { files: filesData, tree } = await fetchFiles();
    
    // 2. Set both states
    setFiles(filesData);
    setFileTree(tree); // Make sure you have this state: const [fileTree, setFileTree] = useState(null);
    
    // 3. Initialize socket with the flat files data
    initializeSocket(filesData);
    
    // 4. Set username (unchanged)
    localStorage.setItem('username', user);
    
    // 5. Set default active file if needed
    if (!activeFile) {
      setActiveFile('index.html');
    }
  } catch (error) {
    console.error('Initialization error:', error);
    setConnectionStatus('Initialization failed');
  }
};

    initialize();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, navigate, location.state, fetchFiles, initializeSocket,activeFile]);

  // Track cursor position more frequently
  useEffect(() => {
    if (!editorRef.current || !socketRef.current?.connected) return;

    const editor = editorRef.current;
    
    const handleCursorChange = () => {
      if (isUpdatingFromSocket.current) return;
      
      const selection = editor.getSelection();
      if (selection) {
        const position = {
          lineNumber: selection.positionLineNumber,
          column: selection.positionColumn
        };
        
        socketRef.current.emit('cursor-position', {
          roomId,
          filePath: activeFile,
          position,
          username
        });
      }
    };

    const disposable = editor.onDidChangeCursorPosition(handleCursorChange);
    return () => disposable.dispose();
  }, [roomId, activeFile, username]);

  // Handle code changes with real-time sync

const handleMouseMove =useCallback((e) => {
  if (!isDragging) return;
  
  const container = document.querySelector('.main-editor');
  if (!container) return;
  
  const containerRect = container.getBoundingClientRect();
  const containerWidth = containerRect.width;
  const mouseX = e.clientX - containerRect.left;
  const newWidth = (mouseX / containerWidth) * 100;
  
  // Limit the width between 20% and 80%
  setPanelWidth(Math.min(Math.max(newWidth, 30), 70));
},[isDragging]);
const handleMouseUp =useCallback( () => {
  setIsDragging(false);
  document.body.style.cursor = '';
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
},[handleMouseMove]);
// Add this to your cleanup effects
useEffect(() => {
  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
}, [handleMouseMove, handleMouseUp]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
  setIsDragging(true);
  document.body.style.cursor = 'col-resize';
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
},[handleMouseMove, handleMouseUp]);

  const handleCodeChange = useCallback((value) => {
    if (!value) value = '';
    if (isUpdatingFromSocket.current) return;
    
    const timestamp = Date.now();
    lastChangeTimestamp.current = timestamp;
     
    setFiles(prev => {
      if (prev[activeFile] !== value) {
        const newFiles = { ...prev, [activeFile]: value };
        
        if (socketRef.current?.connected) {
          const selection = editorRef.current?.getSelection();
          const position = selection ? {
            lineNumber: selection.positionLineNumber,
            column: selection.positionColumn
          } : null;
          
          // Emit real-time changes
          socketRef.current.emit('code-change', {
            roomId,
            filePath: activeFile,
            code: value,
            position,
            timestamp,
            username
          });

          // Emit typing indicator
          socketRef.current.emit('user-typing', {
            roomId,
            filePath: activeFile,
            username
          });
        }
        
        // Debounced save to database
        debouncedSave(roomId, activeFile, value);
        return newFiles;
      }
      return prev;
    });
  }, [activeFile, roomId, debouncedSave, username]);
const handleAddFile = () => {
  setShowNewFileModal(true);
};

const handleAddFolder = () => {
  setShowNewFolderModal(true);
};
const createNewFile = async () => {
  if (!newFileName) return;
  
  const fileExt = newFileName.split('.').pop();
  let defaultContent = '';
  
  if (fileExt === 'html') {
    defaultContent = '<!DOCTYPE html>\n<html>\n<head>\n    <title>New File</title>\n</head>\n<body>\n    \n</body>\n</html>';
  } else if (fileExt === 'css') {
    defaultContent = '/* Your CSS here */';
  } else if (fileExt === 'js') {
    defaultContent = '// Your JavaScript here';
  }
  
  try {
    // Save to backend first
    await fetch('https://realtime-code-editor-backend-l2ok.onrender.com/api/code/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        roomId, 
        filePath: newFileName, 
        content: defaultContent 
      }),
    });

    // Then update local state
    setFiles(prev => ({ ...prev, [newFileName]: defaultContent }));
    
    setFileTree(prevTree => {
      if (!prevTree) return prevTree;
      
      // Check if file already exists in tree
      const exists = prevTree.children.some(child => 
        child.path === newFileName
      );
      
      if (!exists) {
        return {
          ...prevTree,
          children: [
            ...prevTree.children,
            {
              name: newFileName,
              type: 'file',
              path: newFileName,
              content: defaultContent
            }
          ]
        };
      }
      return prevTree;
    });
        if (socketRef.current?.connected) {
      socketRef.current.emit('new-file-created', {
        roomId,
        filePath: newFileName,
        content: defaultContent,
        username
      });
    }

    setActiveFile(newFileName);
    setShowNewFileModal(false);
    setNewFileName('');
    
    // Notify other users
    if (socketRef.current?.connected) {
      socketRef.current.emit('code-change', {
        roomId,
        filePath: newFileName,
        code: defaultContent,
        username
      });
    }
  } catch (error) {
    console.error('Error creating file:', error);
  }
};
const createFileAtPath = async (path) => {
  const fileExt = path.split('.').pop();
  let defaultContent = '';
  if (fileExt === 'html') defaultContent = '<!DOCTYPE html>\n<html>\n<head>\n<title></title>\n</head>\n<body>\n</body>\n</html>';
  if (fileExt === 'css') defaultContent = '/* CSS here */';
  if (fileExt === 'js') defaultContent = '// JS here';

  await fetch('https://realtime-code-editor-backend-l2ok.onrender.com/api/code/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, filePath: path, content: defaultContent }),
  });

  setFiles(prev => ({ ...prev, [path]: defaultContent }));
  setFileTree(prevTree => {
    if (!prevTree) return prevTree;

    const newNode = {
      name: path.split('/').pop(),
      type: 'file',
      path,
      content: defaultContent
    };

    // Recursively insert file under the correct folder
    const insertFile = (tree, folderPath) => {
      if (tree.path === folderPath) {
        tree.children.push(newNode);
        return true;
      }
      for (const child of tree.children) {
        if (child.type === 'folder' && insertFile(child, folderPath)) return true;
      }
      return false;
    };

    const updatedTree = JSON.parse(JSON.stringify(prevTree));
    insertFile(updatedTree, path.substring(0, path.lastIndexOf('/') + 1));
    return updatedTree;
  });

  if (socketRef.current?.connected) {
    socketRef.current.emit('new-file-created', {
      roomId,
      filePath: path,
      content: defaultContent,
      username
    });
  }
};

const createNewFolder = async () => {
  if (!newFolderName) return;
  
  try {
    // Ensure folder path ends with /
    const folderPath = newFolderName.endsWith('/') ? 
      newFolderName : `${newFolderName}/`;
    
    // Save to backend
    await fetch('https://realtime-code-editor-backend-l2ok.onrender.com/api/code/createFolder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        roomId, 
        path: folderPath 
      }),
    });

    // Update local state
    setFileTree(prevTree => {
      if (!prevTree) return prevTree;
      
      // Check if folder already exists
      const exists = prevTree.children.some(child => 
        child.path === folderPath
      );
      
      if (!exists) {
        return {
          ...prevTree,
          children: [
            ...prevTree.children,
            {
              name: newFolderName,
              type: 'folder',
              path: folderPath,
              children: []
            }
          ]
        };
      }
      return prevTree;
    });
    
    setShowNewFolderModal(false);
    setNewFolderName('');
        if (socketRef.current?.connected) {
      socketRef.current.emit('new-folder-created', {
        roomId,
        path: folderPath,
        username
      });
    }

  } catch (error) {
    console.error('Error creating folder:', error);
  }
};
  // Handle running the code
  const handleRun = () => {
    if (!files || !iframeRef.current) return;

    const html = files['index.html'] || '';
    const css = files['style.css'] || '';
    const js = files['script.js'] || '';

    const combined = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${css}</style>
        </head>
        <body>
          ${html}
          <script>
            // Error handling for iframe
            window.onerror = function(msg, url, line, col, error) {
              console.error('Error:', msg, 'at', line + ':' + col);
              return false;
            };
            ${js}
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([combined], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    iframeRef.current.src = url;
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Handle file switching
  // const handleFileSwitch = (fileName) => {
  //   setActiveFile(fileName);
  //    if (editorRef.current?.models?.[fileName]) {
  //   editorRef.current.setModel(editorRef.current.models[fileName]);
  // }
  //   if (socketRef.current?.connected) {
  //     socketRef.current.emit('file-switch', {
  //       roomId,
  //       filePath: fileName,
  //       username
  //     });
  //   }
  // };
 const handleEditorMount = (editor, monaco) => {
  editorRef.current = editor;

  // Initialize models object if not present
  if (!editorRef.current.models) {
    editorRef.current.models = {};
  }

  // Create or reuse a separate model for each file
  Object.entries(files).forEach(([filePath, content]) => {
    if (!editorRef.current.models[filePath]) {
      const lang = getLanguage(filePath);
      editorRef.current.models[filePath] = monaco.editor.createModel(content, lang);
    }
  });

  // Set current active model
  const activeModel = editorRef.current.models[activeFile];
  if (activeModel) {
    editor.setModel(activeModel);
  }

  // Cursor tracking
  editor.onDidChangeCursorPosition(() => {
    if (socketRef.current?.connected && !isUpdatingFromSocket.current) {
      const selection = editor.getSelection();
      if (selection) {
        const position = {
          lineNumber: selection.positionLineNumber,
          column: selection.positionColumn
        };
        socketRef.current.emit('cursor-position', {
          roomId,
          filePath: activeFile,
          position,
          username
        });
      }
    }
  });
};
const handleFileSwitch = (fileName) => {
  setActiveFile(fileName);

  const model = editorRef.current?.models?.[fileName];
  if (model) {
    editorRef.current.setModel(model);  // ✅ this is correct
  }
};


  // Cleanup on page unload
  useBeforeUnload(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  });

  const getLanguage = (file) => {
    if (file.endsWith('.js')) return 'javascript';
    if (file.endsWith('.html')) return 'html';
    if (file.endsWith('.css')) return 'css';
    return 'plaintext';
  };

  if (!files || !fileTree) {
    return (
      <div className="editor-wrapper" >
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <div>Loading collaborative editor...</div>
          <div className="connection-status">{connectionStatus}</div>
        </div>
      </div>
    );
  }

  const typingUsersList = Object.values(typingUsers);

  return (
    <div className="editor-wrapper">
      <div className="collaboration-bar">
        <div className="room-info">
          <strong>Room:</strong> {roomId} | <strong>User:</strong> {username}
          <span className={`connection-status ${connectionStatus === 'Connected' ? 'connected' : 'disconnected'}`}>
            ● {connectionStatus}
          </span>
        </div>
        
        <div className="online-users">
          <span className="users-label">Online ({users.length}):</span>
          {users.map(user => (
            <div 
              key={user.id} 
              className="user-badge"
              style={{ backgroundColor: getUserColor(user.id) }}
            >
              {user.username}
              {user.id === currentUserRef.current && ' (You)'}
            </div>
          ))}
        </div>

        {typingUsersList.length > 0 && (
          <div className="typing-indicator">
            <span className="typing-dots">●●●</span>
            {typingUsersList.map(t => t.username).join(', ')} 
            {typingUsersList.length === 1 ? ' is' : ' are'} typing in {activeFile}...
          </div>
        )}
      </div>

      <div className="editor-container" style={{ flexDirection: 'row' }}>
        <div className="sidebar">
          <FileSidebar
            tree={fileTree} 
           activeFile={activeFile}
         setActiveFile={handleFileSwitch}
         onAddFile={handleAddFile}
             onAddFolder={handleAddFolder}
               onAddFileToFolder={createFileAtPath}
               roomId={roomId}
               setFiles={setFiles}           // Pass down the setter
          setFileTree={setFileTree}     // Pass down the setter
      socketRef={socketRef}         // Pass down the ref
      username={username}
          /> 
        </div>

        <div className="main-editor noselect" style={{ display: 'flex', flexDirection: 'row', flex: 1 }}>
          
          <div style={{ width: `${panelWidth}%`, display: 'flex', flexDirection: 'column',minWidth: '300px' }}>
          <div className="editor-header">
            <div className="file-info">
              <strong>{activeFile}</strong>
              <span className="file-language">({getLanguage(activeFile)})</span>
            </div>
            <button className="run-button" onClick={handleRun}>
              ▶ Run 
            </button>
            <button className="download-button" onClick={downloadProjectAsZip}>
             ⬇ Download ZIP
           </button>
          </div>

          <div className="editor-container-with-cursors">
            <Editor
              height="50vh"
              language={getLanguage(activeFile)}
              value={files[activeFile] || ""}
              onChange={handleCodeChange}
              onMount={handleEditorMount}//(editor,monaco) => {
//                 editorRef.current = editor;
//                  if (!editorRef.current.models) {
//     editorRef.current.models = {};
//   }
  
//   Object.entries(files).forEach(([filePath, content]) => {
//     if (!editorRef.current.models[filePath]) {
//       const language = getLanguage(filePath);
//       editorRef.current.models[filePath] = monaco.editor.createModel(content, language);
//     } 
//   });

//   editor.setModel(editorRef.current.models[activeFile]);

//   // Save the models for reuse
// //  editorRef.current.models = models;
//                 // Add cursor tracking
//                 editor.onDidChangeCursorPosition(() => {
//                   if (socketRef.current?.connected && !isUpdatingFromSocket.current) {
//                     const selection = editor.getSelection();
//                     if (selection) {
//                       const position = {
//                         lineNumber: selection.positionLineNumber,
//                         column: selection.positionColumn
//                       };
                      
//                       socketRef.current.emit('cursor-position', {
//                         roomId,
//                         filePath: activeFile,
//                         position,
//                         username
//                       });
//                     }
//                   }
//                 });
//               }}


              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                renderWhitespace: 'selection',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: true,
              }}
            />
            
            {/* Render other users' cursors */}
            {Object.entries(userCursors).map(([userId, cursor]) => (
              cursor.activeFile === activeFile && (
                <div
                  key={userId}
                  className="user-cursor"
                  style={{
                    position: 'absolute',
                    top: `${(cursor.position?.lineNumber || 0) * 18}px`,
                    left: `${(cursor.position?.column || 0) * 8}px`,
                    borderLeft: `2px solid ${getUserColor(userId)}`,
                    height: '18px',
                    pointerEvents: 'none',
                    zIndex: 1000,
                  }}
                >
                  <div
                    className="user-cursor-label"
                    style={{
                      backgroundColor: getUserColor(userId),
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '11px',
                      position: 'absolute',
                      top: '-20px',
                      left: '0',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cursor.username}
                  </div>
                </div>
              )
            ))}
          </div>
          </div>
<div 
    className="resize-handle"
    onMouseDown={handleMouseDown}
    style={{ 
      width: '5px', 
      cursor: 'col-resize',
      backgroundColor: isDragging ? '#007acc' : '#3e3e42',
      transition: 'background-color 0.2s ease'
    }}
  />
          <div className="output-panel" style={{ width: `${100 - panelWidth}%`, minWidth: '300px' }}>
            <div className="output-header">
              <strong>Output Preview</strong>
              <button className="refresh-output" onClick={handleRun}>
                🔄 Refresh
              </button>
            </div>
            <iframe
              ref={iframeRef}
              title="Live Code Output"
              className="output-frame"
                style={{ flex: 1, border: 'none', background: 'white', width: '100%', height: '100%' }}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>
      </div>
      {showNewFileModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New File</h3>
            <input
              type="text"
              placeholder="filename.html/.css/.js"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={() => setShowNewFileModal(false)}>Cancel</button>
              <button onClick={createNewFile}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showNewFolderModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={() => setShowNewFolderModal(false)}>Cancel</button>
              <button onClick={createNewFolder}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
   

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default EditorPage;