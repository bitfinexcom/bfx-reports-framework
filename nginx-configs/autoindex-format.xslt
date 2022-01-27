<?xml version="1.0"?>
<!DOCTYPE fnord [<!ENTITY nbsp "&#160;">]>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns="http://www.w3.org/1999/xhtml" xmlns:func="http://exslt.org/functions" version="1.0" exclude-result-prefixes="xhtml" extension-element-prefixes="func">
  <xsl:output method="xml" version="1.0" encoding="UTF-8" doctype-public="-//W3C//DTD XHTML 1.1//EN" doctype-system="http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd" indent="yes" media-type="application/xhtml+xml"/>
  <xsl:strip-space elements="*" />

  <xsl:template name="size">
    <xsl:param name="bytes"/>
    <xsl:choose>
      <xsl:when test="$bytes &lt; 1000"><xsl:value-of select="$bytes" />B</xsl:when>
      <xsl:when test="$bytes &lt; 1048576"><xsl:value-of select="format-number($bytes div 1024, '0.0')" />K</xsl:when>
      <xsl:when test="$bytes &lt; 1073741824"><xsl:value-of select="format-number($bytes div 1048576, '0.0')" />M</xsl:when>
      <xsl:otherwise><xsl:value-of select="format-number(($bytes div 1073741824), '0.00')" />G</xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="timestamp">
    <xsl:param name="iso-timestamp" />
    <xsl:value-of select="concat(substring($iso-timestamp, 0, 11), ' ', substring($iso-timestamp, 12, 8))" />
  </xsl:template>

  <xsl:template name="breadcrumb">
    <xsl:param name="list" />
    <xsl:param name="delimiter" select="'/'"  />
    <xsl:param name="reminder" select="$list" />
    <xsl:variable name="newlist">
      <xsl:choose>
        <xsl:when test="contains($list, $delimiter)">
          <xsl:value-of select="normalize-space($list)" />
        </xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="concat(normalize-space($list), $delimiter)"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="first" select="substring-before($newlist, $delimiter)" />
    <xsl:variable name="remaining" select="substring-after($newlist, $delimiter)" />
    <xsl:variable name="current" select="substring-before($reminder, $remaining)" />

    <xsl:choose>
      <xsl:when test="$remaining">
        <xsl:choose>
          <xsl:when test="$first = ''">
            <li class="breadcrumb-item">
              <i class="fas fa-home"></i><a href="/">Home</a>
            </li>
          </xsl:when>
          <xsl:otherwise>
            <li class="breadcrumb-item">
              <a href="{$current}"><xsl:value-of select="$first" /></a>
            </li>
          </xsl:otherwise>
        </xsl:choose>

        <xsl:call-template name="breadcrumb">
          <xsl:with-param name="list" select="$remaining" />
          <xsl:with-param name="delimiter" select="$delimiter" />
          <xsl:with-param name="reminder" select="$reminder" />
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:choose>
          <xsl:when test="$first = ''">
            <li class="breadcrumb-item">
              <i class="fas fa-home"></i><a href="/">Home</a>
            </li>
          </xsl:when>
          <xsl:otherwise>
            <li class="breadcrumb-item active">
              <a href="{$current}"><xsl:value-of select="$first" /></a>
            </li>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="directory">
    <tr>
      <td class="n">
        <a href="{current()}/">
          <code>
            <i class="far fa-folder" style="padding-right: 5px;"></i><xsl:value-of select="."/>
          </code>
        </a>
      </td>
      <td class="m">
        <code>
          <xsl:call-template name="timestamp"><xsl:with-param name="iso-timestamp" select="@mtime" /></xsl:call-template>
        </code>
      </td>
      <td class="s">- &nbsp;</td>
    </tr>
  </xsl:template>

  <xsl:template name="icon">
    <xsl:param name="path"/>
    <xsl:variable name="extension">
      <xsl:call-template name="get-file-extension">
        <xsl:with-param name="path" select="$path" />
      </xsl:call-template>
    </xsl:variable>

    <xsl:choose>
      <xsl:when test="$extension = 'bz2'">
        <i class="far fa-file-archive" style="padding-right: 5px;"></i>
      </xsl:when>
      <xsl:when test="$extension = 'gz'">
        <i class="far fa-file-archive" style="padding-right: 5px;"></i>
      </xsl:when>
      <xsl:when test="$extension = 'xz'">
        <i class="far fa-file-archive" style="padding-right: 5px;"></i>
      </xsl:when>
      <xsl:when test="$extension = 'zip'">
        <i class="far fa-file-archive" style="padding-right: 5px;"></i>
      </xsl:when>
      <xsl:otherwise>
        <i class="far fa-file" style="padding-right: 5px;"></i>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="get-file-extension">
    <xsl:param name="path"/>
    <xsl:choose>
      <xsl:when test="contains($path, '/')">
        <xsl:call-template name="get-file-extension">
          <xsl:with-param name="path" select="substring-after($path, '/')"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:when test="contains($path, '.')">
        <xsl:call-template name="get-file-extension">
          <xsl:with-param name="path" select="substring-after($path, '.')"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$path"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="file">
    <tr>
      <td class="n">
        <a href="{current()}">
          <code>
            <xsl:call-template name="icon"><xsl:with-param name="path" select="." /></xsl:call-template>
            <xsl:value-of select="." />
          </code>
        </a>
      </td>
      <td class="m">
        <code>
          <xsl:call-template name="timestamp"><xsl:with-param name="iso-timestamp" select="@mtime" /></xsl:call-template>
        </code>
      </td>
      <td class="s">
        <code>
          <xsl:call-template name="size"><xsl:with-param name="bytes" select="@size" /></xsl:call-template>
        </code>
      </td>
    </tr>
  </xsl:template>

  <xsl:template match="/">
    <html>
      <head>
        <title>Bitfinex Reporting &amp; Performance Tools</title>
        <meta charset="utf-8" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/4.4.1/css/bootstrap.min.css" integrity="sha256-L/W5Wfqfa0sdBNIKN9cG6QA5F2qx4qICmU2VgLruv9Y=" crossorigin="anonymous" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.12.0/css/all.min.css" integrity="sha256-ybRkN9dBjhcS2qrW1z+hfCxq+1aBdwyQM5wlQoQVt/0=" crossorigin="anonymous" />
        <style type="text/css">
          html {
            position: relative;
            min-height: 100%;
          }

          body {
            background-color: #102331;
            color: #f5f8fa;
          }

          .table {
            color: #f5f8fa;
          }

          .table thead {
            color: #82baf6;
          }

          .table a {
            color: #f5f8fa;
          }

          .table td, .table th {
            padding: 0.75rem;
            vertical-align: top;
            border-top: 1px solid #19354a;
          }

          .table thead th {
            vertical-align: bottom;
            border-bottom: 3px solid #19354a;
            border-top: 0
          }

          .title {
            text-align: center;
          }

          .m code {
            color: #03ca9b;
          }

          .s code {
            color: #d85f64;
          }

          .parent-dir {
            opacity: 0.4;
          }

          .breadcrumb {
            color: #82baf6;
            background-color: #172d3e;
          }

          .fa, .far, .fas {
            color: #82baf6;
          }

          .breadcrumb a {
            color: #82baf6;
          }

          .container {
            width: auto;
            max-width: 980px;
            padding: 0 15px;
          }
        </style>
      </head>
      <body>
        <main role="main" class="container">
          <h1 class="mt-5 title">Bitfinex Report CSV</h1>
          <ol class="breadcrumb"><xsl:call-template name="breadcrumb"><xsl:with-param name="list" select="$path" /></xsl:call-template></ol>
          <div class="list">
            <table class="table" summary="Directory Listing" cellpadding="0" cellspacing="0">
                <colgroup>
                  <col span="1" style="width: 65%;"/>
                  <col span="1" style="width: 25%;"/>
                  <col span="1" style="width: 10%;"/>
                </colgroup>
              <thead>
                <tr>
                  <th class="n">Name</th>
                  <th class="m">Last Modified</th>
                  <th class="s">Size</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="n parent-dir"><a href="../"><i class="fas fa-level-up-alt" style="padding-right: 5px;"></i>Parent Directory</a></td>
                  <td class="m">&nbsp;</td>
                  <td class="s">- &nbsp;</td>
                </tr>
                <xsl:apply-templates />
              </tbody>
            </table>
          </div>
        </main>

        <script>
          window.history.replaceState({}, document.title, window.location.pathname)
        </script>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
