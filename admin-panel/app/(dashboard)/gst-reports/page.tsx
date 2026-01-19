'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { api } from '@/lib/api';
import { FileText, Download } from 'lucide-react';

export default function GSTReportsPage() {
  const [loading, setLoading] = useState(false);
  const [gstr1Data, setGstr1Data] = useState<any>(null);
  const [gstr3bData, setGstr3bData] = useState<any>(null);
  
  const [gstr1Dates, setGstr1Dates] = useState({
    start_date: '',
    end_date: '',
  });
  
  const [gstr3bPeriod, setGstr3bPeriod] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  const fetchGSTR1 = async () => {
    if (!gstr1Dates.start_date || !gstr1Dates.end_date) {
      alert('Please select both start and end dates');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.get('/reports/gstr1', {
        params: gstr1Dates,
      });
      setGstr1Data(response.data);
    } catch (error) {
      logger.error('Failed to fetch GSTR-1:', error);
      alert('Failed to fetch GSTR-1 report');
    } finally {
      setLoading(false);
    }
  };

  const fetchGSTR3B = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reports/gstr3b', {
        params: gstr3bPeriod,
      });
      setGstr3bData(response.data);
    } catch (error) {
      logger.error('Failed to fetch GSTR-3B:', error);
      alert('Failed to fetch GSTR-3B report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">GST Reports</h1>
        <p className="text-gray-600 mt-1">Generate GST compliance reports</p>
      </div>

      {/* GSTR-1 Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            GSTR-1 - Outward Supplies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={gstr1Dates.start_date}
                onChange={(e) => setGstr1Dates({ ...gstr1Dates, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={gstr1Dates.end_date}
                onChange={(e) => setGstr1Dates({ ...gstr1Dates, end_date: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchGSTR1} disabled={loading} className="w-full">
                Generate Report
              </Button>
            </div>
          </div>

          {gstr1Data && (
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Taxable Value</p>
                    <p className="text-2xl font-bold">₹{gstr1Data.total_taxable_value.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">CGST</p>
                    <p className="text-2xl font-bold">₹{gstr1Data.total_cgst.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">SGST</p>
                    <p className="text-2xl font-bold">₹{gstr1Data.total_sgst.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">IGST</p>
                    <p className="text-2xl font-bold">₹{gstr1Data.total_igst.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>HSN/SAC Code</TableHead>
                    <TableHead>GST Rate</TableHead>
                    <TableHead>Taxable Value</TableHead>
                    <TableHead>CGST</TableHead>
                    <TableHead>SGST</TableHead>
                    <TableHead>IGST</TableHead>
                    <TableHead>Total GST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gstr1Data.items.map((item: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>{item.hsn_code || 'N/A'}</TableCell>
                      <TableCell>{(item.gst_rate * 100).toFixed(0)}%</TableCell>
                      <TableCell>₹{item.taxable_value.toFixed(2)}</TableCell>
                      <TableCell>₹{item.cgst_amount.toFixed(2)}</TableCell>
                      <TableCell>₹{item.sgst_amount.toFixed(2)}</TableCell>
                      <TableCell>₹{item.igst_amount.toFixed(2)}</TableCell>
                      <TableCell>₹{item.total_gst.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GSTR-3B Report */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            GSTR-3B - Summary Return
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={gstr3bPeriod.year}
                onChange={(e) => setGstr3bPeriod({ ...gstr3bPeriod, year: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <select
                id="month"
                value={gstr3bPeriod.month}
                onChange={(e) => setGstr3bPeriod({ ...gstr3bPeriod, month: parseInt(e.target.value) })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={fetchGSTR3B} disabled={loading} className="w-full">
                Generate Report
              </Button>
            </div>
          </div>

          {gstr3bData && (
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Outward Taxable Supplies</p>
                    <p className="text-2xl font-bold">₹{gstr3bData.outward_taxable_supplies.toFixed(2)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Total Tax</p>
                    <p className="text-2xl font-bold">₹{gstr3bData.total_tax.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tax Component</TableHead>
                    <TableHead className="text-right">Amount (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>CGST</TableCell>
                    <TableCell className="text-right">₹{gstr3bData.outward_cgst.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>SGST</TableCell>
                    <TableCell className="text-right">₹{gstr3bData.outward_sgst.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>IGST</TableCell>
                    <TableCell className="text-right">₹{gstr3bData.outward_igst.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow className="font-bold">
                    <TableCell>Total Tax</TableCell>
                    <TableCell className="text-right">₹{gstr3bData.total_tax.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

