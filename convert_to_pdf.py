import os
import win32com.client

def convert_docx_to_pdf(docx_filename, pdf_filename):
    abs_docx = os.path.abspath(docx_filename)
    abs_pdf = os.path.abspath(pdf_filename)

    print(f"[*] Converting '{abs_docx}' to '{abs_pdf}'...")
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False

    try:
        doc = word.Documents.Open(abs_docx)
        # 17 = wdFormatPDF
        doc.SaveAs(abs_pdf, FileFormat=17)
        doc.Close()
        print(f"[+] PDF successfully created: {abs_pdf}")
    except Exception as e:
        print(f"[X] PDF conversion failed: {e}")
    finally:
        word.Quit()

if __name__ == "__main__":
    convert_docx_to_pdf("PlaceX_BTech_Thesis.docx", "PlaceX_BTech_Thesis.pdf")
