"""
PlaceX Webapp — placex_core package initialization.
Hooks PyMySQL as MySQLdb driver for MySQL connectivity.
"""
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass
