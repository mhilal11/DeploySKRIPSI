package middleware

import (
	"compress/gzip"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type gzipResponseWriter struct {
	gin.ResponseWriter
	gzipWriter  *gzip.Writer
	wroteHeader bool
}

func (g *gzipResponseWriter) WriteHeader(code int) {
	if g.wroteHeader {
		return
	}
	g.wroteHeader = true

	if code == http.StatusNoContent || code == http.StatusNotModified {
		g.ResponseWriter.WriteHeader(code)
		return
	}

	header := g.Header()
	header.Del("Content-Length")
	header.Set("Content-Encoding", "gzip")
	header.Add("Vary", "Accept-Encoding")

	g.ResponseWriter.WriteHeader(code)
}

func (g *gzipResponseWriter) Write(data []byte) (int, error) {
	if !g.wroteHeader {
		g.WriteHeader(http.StatusOK)
	}
	return g.gzipWriter.Write(data)
}

func (g *gzipResponseWriter) WriteString(s string) (int, error) {
	return g.Write([]byte(s))
}

// Gzip compresses response body when the client supports gzip.
func Gzip() gin.HandlerFunc {
	return func(c *gin.Context) {
		acceptEncoding := strings.ToLower(c.GetHeader("Accept-Encoding"))
		if !strings.Contains(acceptEncoding, "gzip") || c.Request.Method == http.MethodHead {
			c.Next()
			return
		}

		if strings.Contains(strings.ToLower(c.GetHeader("Connection")), "upgrade") {
			c.Next()
			return
		}

		writer := gzip.NewWriter(c.Writer)
		defer writer.Close()

		gz := &gzipResponseWriter{
			ResponseWriter: c.Writer,
			gzipWriter:     writer,
		}
		c.Writer = gz
		c.Next()
	}
}
