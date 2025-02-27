import React, { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { Navbar, Container, Button, Modal, Form, Alert, Nav } from 'react-bootstrap';
import { FaPlus, FaMagic, FaDownload, FaUpload } from 'react-icons/fa';

export default function FlowBuilder() {
  return (
    <ReactFlowProvider>
      <FlowBuilderContent />
    </ReactFlowProvider>
  );
}

function FlowBuilderContent() {
  // 1) State for nodes & edges
  const [nodes, setNodes, onNodesChange] = useNodesState([
    {
      id: '1',
      type: 'default',
      position: { x: 100, y: 100 },
      data: { label: 'Start' },
    },
  ]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // 2) Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // 3) Current node in the modal
  const [currentNode, setCurrentNode] = useState({
    id: '',
    label: '',
    description: '',
  });

  // 4) Handlers
  const handleAddNode = () => {
    setError('');
    setIsEditMode(false);
    setCurrentNode({ id: '', label: '', description: '' });
    setShowModal(true);
  };

  const handleNodeClick = useCallback((_, node) => {
    setError('');
    setIsEditMode(true);
    setCurrentNode({
      id: node.id,
      label: node.data.label || '',
      description: node.data.description || '',
    });
    setShowModal(true);
  }, []);

  const handleSaveNode = () => {
    if (!currentNode.label.trim()) {
      setError('Label is required');
      return;
    }
    setError('');

    if (isEditMode) {
      // Update existing node
      setNodes((nds) =>
        nds.map((n) =>
          n.id === currentNode.id
            ? {
                ...n,
                data: {
                  label: currentNode.label,
                  description: currentNode.description,
                },
              }
            : n
        )
      );
    } else {
      // Add new node
      const newNode = {
        id: uuidv4(),
        position: { x: 150, y: 100 + 70 * (nodes.length || 1) },
        data: {
          label: currentNode.label,
          description: currentNode.description,
        },
      };
      setNodes((nds) => nds.concat(newNode));
    }

    setShowModal(false);
  };

  const handleDeleteNode = () => {
    if (isEditMode) {
      // Remove node & related edges
      setNodes((nds) => nds.filter((n) => n.id !== currentNode.id));
      setEdges((eds) =>
        eds.filter(
          (e) => e.source !== currentNode.id && e.target !== currentNode.id
        )
      );
      setShowModal(false);
    }
  };

  const handleExport = () => {
    const data = { nodes, edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'flow.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target.result);
        if (json.nodes && json.edges) {
          setNodes(json.nodes);
          setEdges(json.edges);
        }
      } catch {
        setError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 5) Auto-arrange (simple top-down)
  const autoArrange = () => {
    const xStart = 100;
    const yStart = 100;
    const yGap = 80;
    setNodes((nds) =>
      nds.map((node, idx) => ({
        ...node,
        position: { x: xStart, y: yStart + idx * yGap },
      }))
    );
  };

  return (
    <>
      {/* NAVBAR */}
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand>Flow Builder</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <div className="d-flex flex-lg-row flex-column gap-2">
                <Button variant="light" onClick={handleAddNode}>
                  <FaPlus /> Add
                </Button>
                <Button variant="light" onClick={autoArrange}>
                  <FaMagic /> Auto
                </Button>
                <Button variant="light" onClick={handleExport}>
                  <FaDownload /> Export
                </Button>
                <Button variant="light" onClick={() => fileInputRef.current.click()}>
                  <FaUpload /> Import
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
              </div>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* REACT FLOW */}
      <div style={{ width: '100%', height: '94vh' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          // Use animated edges by default
          defaultEdgeOptions={{
            type: 'bezier',
            animated: true,
            style: { strokeWidth: 2, stroke: 'black' },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: 'black',
            },
          }}
          onConnect={(params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds))}          
          onNodeClick={handleNodeClick}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      {/* MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{isEditMode ? 'Edit Node' : 'Add Node'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Label</Form.Label>
              <Form.Control
                type="text"
                value={currentNode.label}
                onChange={(e) =>
                  setCurrentNode({ ...currentNode, label: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={currentNode.description}
                onChange={(e) =>
                  setCurrentNode({ ...currentNode, description: e.target.value })
                }
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          {isEditMode && (
            <Button variant="outline-danger" onClick={handleDeleteNode}>
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveNode}>
            Save
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
