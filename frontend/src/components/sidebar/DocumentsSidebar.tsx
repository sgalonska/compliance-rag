'use client'

import React, { useState } from 'react'
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  TextField,
  InputAdornment,
  Divider,
  Tooltip,
  LinearProgress,
  Collapse,
  Paper,
} from '@mui/material'
import {
  Description,
  PictureAsPdf,
  TextFields,
  Code,
  MoreVert,
  Search,
  Upload,
  Folder,
  ExpandLess,
  ExpandMore,
  FilterList,
  CheckCircle,
  Schedule,
  Error as ErrorIcon,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useDocuments } from '@/hooks/use-documents'
import { Document } from '@/types/document'
import { formatBytes, formatTimeAgo } from '@/lib/utils'

interface DocumentsSidebarProps {
  onDocumentSelect?: (document: Document) => void
  selectedDocumentId?: string
}

export function DocumentsSidebar({ onDocumentSelect, selectedDocumentId }: DocumentsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['recent', 'all']))
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'processed' | 'processing' | 'error'>('all')

  const { data, isLoading } = useDocuments({
    query: searchQuery || undefined,
    limit: 50,
  })

  const documents = data?.documents || []

  const handleDocumentClick = (document: Document) => {
    onDocumentSelect?.(document)
  }

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget)
  }

  const handleFilterClose = () => {
    setFilterMenuAnchor(null)
  }

  const handleFilterSelect = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter)
    handleFilterClose()
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return <PictureAsPdf color="error" />
      case 'txt':
      case 'md':
        return <TextFields color="primary" />
      case 'docx':
      case 'doc':
        return <Description color="info" />
      default:
        return <Description />
    }
  }

  const getStatusIcon = (document: Document) => {
    // Assuming we have a processed field or similar status indicator
    const isProcessed = true // document.processed
    if (isProcessed) {
      return <CheckCircle color="success" sx={{ fontSize: 16 }} />
    }
    return <Schedule color="warning" sx={{ fontSize: 16 }} />
  }

  const filteredDocuments = documents.filter(doc => {
    if (selectedFilter === 'processed') return true // doc.processed
    if (selectedFilter === 'processing') return false // !doc.processed && !doc.error
    if (selectedFilter === 'error') return false // doc.error
    return true
  })

  const recentDocuments = filteredDocuments.slice(0, 5)
  const allDocuments = filteredDocuments

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'background.paper' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Documents
          </Typography>
          <Box>
            <Tooltip title="Filter">
              <IconButton size="small" onClick={handleFilterClick}>
                <FilterList />
              </IconButton>
            </Tooltip>
            <Tooltip title="Upload">
              <IconButton size="small" color="primary">
                <Upload />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              backgroundColor: 'grey.50',
            },
          }}
        />

        {/* Filter Chip */}
        {selectedFilter !== 'all' && (
          <Box sx={{ mt: 1 }}>
            <Chip
              label={selectedFilter}
              size="small"
              onDelete={() => setSelectedFilter('all')}
              color="primary"
              variant="outlined"
            />
          </Box>
        )}
      </Box>

      {/* Loading */}
      {isLoading && <LinearProgress />}

      {/* Document List */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <List sx={{ height: '100%', overflow: 'auto', p: 0 }}>
          {/* Recent Documents */}
          <ListItem>
            <ListItemButton onClick={() => toggleFolder('recent')} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {expandedFolders.has('recent') ? <ExpandLess /> : <ExpandMore />}
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    Recent
                  </Typography>
                } 
              />
              <Chip label={recentDocuments.length} size="small" sx={{ height: 20, fontSize: 11 }} />
            </ListItemButton>
          </ListItem>

          <Collapse in={expandedFolders.has('recent')}>
            <AnimatePresence>
              {recentDocuments.map((document, index) => (
                <motion.div
                  key={document.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ListItem disablePadding sx={{ pl: 2 }}>
                    <ListItemButton
                      selected={selectedDocumentId === document.id.toString()}
                      onClick={() => handleDocumentClick(document)}
                      sx={{
                        borderRadius: '8px',
                        mx: 1,
                        mb: 0.5,
                        '&.Mui-selected': {
                          bgcolor: 'primary.50',
                          '&:hover': {
                            bgcolor: 'primary.100',
                          },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {getFileIcon(document.filename)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {document.filename}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            {getStatusIcon(document)}
                            <Typography variant="caption" color="text.secondary">
                              {formatBytes(document.file_size)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              •
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTimeAgo(document.created_at)}
                            </Typography>
                          </Box>
                        }
                      />
                      <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                        <MoreVert sx={{ fontSize: 16 }} />
                      </IconButton>
                    </ListItemButton>
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </Collapse>

          <Divider sx={{ my: 1 }} />

          {/* All Documents */}
          <ListItem>
            <ListItemButton onClick={() => toggleFolder('all')} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {expandedFolders.has('all') ? <ExpandLess /> : <ExpandMore />}
              </ListItemIcon>
              <ListItemText 
                primary={
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    All Documents
                  </Typography>
                } 
              />
              <Chip label={allDocuments.length} size="small" sx={{ height: 20, fontSize: 11 }} />
            </ListItemButton>
          </ListItem>

          <Collapse in={expandedFolders.has('all')}>
            <AnimatePresence>
              {allDocuments.map((document, index) => (
                <motion.div
                  key={document.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <ListItem disablePadding sx={{ pl: 2 }}>
                    <ListItemButton
                      selected={selectedDocumentId === document.id.toString()}
                      onClick={() => handleDocumentClick(document)}
                      sx={{
                        borderRadius: '8px',
                        mx: 1,
                        mb: 0.5,
                        '&.Mui-selected': {
                          bgcolor: 'primary.50',
                          '&:hover': {
                            bgcolor: 'primary.100',
                          },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {getFileIcon(document.filename)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 500,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {document.filename}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            {getStatusIcon(document)}
                            <Typography variant="caption" color="text.secondary">
                              {formatBytes(document.file_size)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              •
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatTimeAgo(document.created_at)}
                            </Typography>
                          </Box>
                        }
                      />
                      <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                        <MoreVert sx={{ fontSize: 16 }} />
                      </IconButton>
                    </ListItemButton>
                  </ListItem>
                </motion.div>
              ))}
            </AnimatePresence>
          </Collapse>
        </List>
      </Box>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={handleFilterClose}
        PaperProps={{
          sx: { borderRadius: '12px', minWidth: 160 }
        }}
      >
        <MenuItem onClick={() => handleFilterSelect('all')}>
          <ListItemText primary="All Documents" />
        </MenuItem>
        <MenuItem onClick={() => handleFilterSelect('processed')}>
          <ListItemIcon>
            <CheckCircle color="success" />
          </ListItemIcon>
          <ListItemText primary="Processed" />
        </MenuItem>
        <MenuItem onClick={() => handleFilterSelect('processing')}>
          <ListItemIcon>
            <Schedule color="warning" />
          </ListItemIcon>
          <ListItemText primary="Processing" />
        </MenuItem>
        <MenuItem onClick={() => handleFilterSelect('error')}>
          <ListItemIcon>
            <ErrorIcon color="error" />
          </ListItemIcon>
          <ListItemText primary="Error" />
        </MenuItem>
      </Menu>
    </Box>
  )
}

export default DocumentsSidebar