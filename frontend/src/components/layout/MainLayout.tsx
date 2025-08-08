'use client'

import React, { useState } from 'react'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material'
import {
  Menu as MenuIcon,
  AccountCircle,
  Settings,
  Logout,
  Add,
  LightMode,
  DarkMode,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/use-auth'

const DRAWER_WIDTH = 320

interface MainLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  showSidebar?: boolean
}

export function MainLayout({ children, sidebar, showSidebar = true }: MainLayoutProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { user, logout } = useAuth()
  
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = () => {
    logout()
    handleClose()
  }

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode)
    // TODO: Implement theme context
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          {showSidebar && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}
          >
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 500 }}>
              Compliance RAG
            </Typography>
          </motion.div>

          {/* New Chat Button */}
          <Tooltip title="New Chat">
            <IconButton
              sx={{
                mr: 2,
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              }}
              size="small"
            >
              <Add />
            </IconButton>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip title="Toggle Theme">
            <IconButton onClick={handleThemeToggle} color="inherit" sx={{ mr: 1 }}>
              {isDarkMode ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          {user && (
            <div>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                  {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                sx={{
                  '& .MuiPaper-root': {
                    borderRadius: '12px',
                    minWidth: '200px',
                    mt: 1,
                  },
                }}
              >
                <MenuItem onClick={handleClose} disabled>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {user.username || user.email}
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleClose}>
                  <Settings sx={{ mr: 2 }} />
                  Settings
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <Logout sx={{ mr: 2 }} />
                  Logout
                </MenuItem>
              </Menu>
            </div>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      {showSidebar && sidebar && (
        <Box
          component="nav"
          sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        >
          {isMobile ? (
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true,
              }}
              sx={{
                '& .MuiDrawer-paper': {
                  boxSizing: 'border-box',
                  width: DRAWER_WIDTH,
                  mt: '64px',
                  height: 'calc(100vh - 64px)',
                },
              }}
            >
              {sidebar}
            </Drawer>
          ) : (
            <Drawer
              variant="permanent"
              sx={{
                '& .MuiDrawer-paper': {
                  boxSizing: 'border-box',
                  width: DRAWER_WIDTH,
                  mt: '64px',
                  height: 'calc(100vh - 64px)',
                },
              }}
              open
            >
              {sidebar}
            </Drawer>
          )}
        </Box>
      )}

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: 'calc(100vh - 64px)',
          mt: '64px',
          overflow: 'hidden',
          backgroundColor: 'background.default',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

export default MainLayout